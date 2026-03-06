'use client'

import { ChainTypeEnum, type EmbeddedAccount, EmbeddedState, RecoveryMethod } from '@openfort/openfort-js'
import { useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { useOpenfort } from '../../../components/Openfort/useOpenfort'
import { useEthereumEmbeddedWallet } from '../../../ethereum/hooks/useEthereumEmbeddedWallet'
import { useOpenfortCore } from '../../../openfort/useOpenfort'
import { useSolanaEmbeddedWallet } from '../../../solana/hooks/useSolanaEmbeddedWallet'
import { logger } from '../../../utils/logger'
import {
  type EthereumUserWallet,
  embeddedAccountToSolanaUserWallet,
  embeddedAccountToUserWallet,
  type SolanaUserWallet,
} from '../walletTypes'
import { useSignOut } from './useSignOut'

/**
 * Options that control the behaviour of {@link useConnectToWalletPostAuth} when attempting to
 * recover or create an embedded wallet after authentication.
 */
export type CreateWalletPostAuthOptions = {
  /**
   * Whether the user should be signed out if automatic wallet creation fails.
   *
   * @defaultValue true
   */
  logoutOnError?: boolean

  /**
   * Whether the hook should automatically attempt to recover an existing wallet that
   * supports automatic recovery.
   *
   * @defaultValue true
   */
  recoverWalletAutomatically?: boolean
}

/**
 * React hook that attempts to recover or create an embedded wallet once a user has authenticated.
 *
 * @returns Helpers that execute the post-authentication wallet connection flow.
 *
 * @example
 * ```ts
 * const { tryUseWallet } = useConnectToWalletPostAuth();
 *
 * const result = await tryUseWallet({ recoverWalletAutomatically: false });
 * if (!result.wallet) {
 *   console.warn('No embedded wallet available after authentication');
 * }
 * ```
 */
export const useConnectToWalletPostAuth = () => {
  const { chainType, setEmbeddedAccounts, setActiveEmbeddedAddress, embeddedState, client } = useOpenfortCore()
  const { walletConfig } = useOpenfort()
  const chainId = walletConfig?.ethereum?.chainId ?? 84532
  const ethereumWallet = useEthereumEmbeddedWallet()
  const solanaWallet = useSolanaEmbeddedWallet()
  const embeddedWallet = chainType === ChainTypeEnum.EVM ? ethereumWallet : solanaWallet
  const { signOut } = useSignOut()
  const queryClient = useQueryClient()
  const tryUseWallet = useCallback(
    async ({
      logoutOnError: signOutOnError = true,
      recoverWalletAutomatically,
    }: CreateWalletPostAuthOptions): Promise<{
      wallet?: EthereumUserWallet | SolanaUserWallet
      passwordRequired?: boolean
    }> => {
      if (walletConfig?.recoverWalletAutomaticallyAfterAuth === false && recoverWalletAutomatically === undefined) {
        return {}
      }

      if (recoverWalletAutomatically === undefined) {
        recoverWalletAutomatically = true
      }
      if (
        (!walletConfig?.createEncryptedSessionEndpoint && !walletConfig?.getEncryptionSession) ||
        !recoverWalletAutomatically
      ) {
        return {}
      }

      const wallets = await queryClient.ensureQueryData<EmbeddedAccount[]>({
        queryKey: ['openfortEmbeddedAccountsList'],
        queryFn: () => client.embeddedWallet.list({ limit: 100 }),
      })

      // Sync to Zustand store so useEthereumEmbeddedWallet/useSolanaEmbeddedWallet can find accounts for setActive
      setEmbeddedAccounts(wallets)

      const chainWallets = wallets.filter((w) => w.chainType === chainType)

      if (chainWallets.length === 0) {
        // Skip auto-creation when disabled in walletConfig.
        // This prevents silent wallet creation on chain switch — callers should check
        // wallet.wallets.length === 0 and call wallet.create() explicitly.
        if (walletConfig?.autoCreateWalletAfterAuth === false) {
          logger.log('tryUseWallet: no wallet for chain, autoCreateWalletAfterAuth=false, skipping creation')
          return {}
        }
        try {
          const account =
            chainType === ChainTypeEnum.SVM ? await embeddedWallet.create() : await embeddedWallet.create({ chainId })

          return {
            wallet:
              chainType === ChainTypeEnum.SVM
                ? embeddedAccountToSolanaUserWallet(account)
                : embeddedAccountToUserWallet(account),
          }
        } catch (err) {
          logger.error('Error creating wallet:', err)
          if (signOutOnError) await signOut()
          return {}
        }
      }

      // Prefer automatic recovery, then passkey — these can be recovered without user input.
      const autoRecoverableWallet =
        chainWallets.find((w) => w.recoveryMethod === RecoveryMethod.AUTOMATIC) ??
        chainWallets.find((w) => w.recoveryMethod === RecoveryMethod.PASSKEY)

      if (autoRecoverableWallet) {
        // If the embedded signer isn't READY yet, skip setActive — the state machine in
        // CoreOpenfortProvider will handle wallet connection once READY is reached.
        // Calling setActive before READY fails with "Embedded wallet not found" because
        // the hook's internal accounts list hasn't been populated via React re-render yet.
        if (embeddedState !== EmbeddedState.READY) {
          // Store the intended address so the state machine activates it when READY
          setActiveEmbeddedAddress(autoRecoverableWallet.address)
          return {
            wallet:
              chainType === ChainTypeEnum.SVM
                ? embeddedAccountToSolanaUserWallet(autoRecoverableWallet)
                : embeddedAccountToUserWallet(autoRecoverableWallet),
          }
        }

        const alreadyActive =
          embeddedWallet.status === 'connected' &&
          embeddedWallet.address &&
          (chainType === ChainTypeEnum.SVM
            ? embeddedWallet.address === autoRecoverableWallet.address
            : (embeddedWallet.address as string).toLowerCase() === autoRecoverableWallet.address.toLowerCase())
        if (alreadyActive) {
          return {
            wallet:
              chainType === ChainTypeEnum.SVM
                ? embeddedAccountToSolanaUserWallet(autoRecoverableWallet)
                : embeddedAccountToUserWallet(autoRecoverableWallet),
          }
        }
        try {
          if (chainType === ChainTypeEnum.SVM) {
            await (solanaWallet as typeof solanaWallet).setActive({ address: autoRecoverableWallet.address })
          } else {
            await (ethereumWallet as typeof ethereumWallet).setActive({
              address: autoRecoverableWallet.address as `0x${string}`,
              chainId,
            })
          }

          return {
            wallet:
              chainType === ChainTypeEnum.SVM
                ? embeddedAccountToSolanaUserWallet(autoRecoverableWallet)
                : embeddedAccountToUserWallet(autoRecoverableWallet),
          }
        } catch (_err) {
          if (signOutOnError) await signOut()
          return {}
        }
      }

      // Password recovery requires user input — signal the caller
      if (chainWallets.some((w) => w.recoveryMethod === RecoveryMethod.PASSWORD)) {
        return { wallet: undefined, passwordRequired: true }
      }

      const first = chainWallets[0]
      return {
        wallet: first
          ? chainType === ChainTypeEnum.SVM
            ? embeddedAccountToSolanaUserWallet(first)
            : embeddedAccountToUserWallet(first)
          : undefined,
      }
    },
    [
      chainType,
      client,
      walletConfig,
      chainId,
      ethereumWallet,
      solanaWallet,
      signOut,
      queryClient,
      embeddedState,
      setActiveEmbeddedAddress,
    ]
  )

  return {
    tryUseWallet,
  }
}
