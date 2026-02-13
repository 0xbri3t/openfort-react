import { AccountTypeEnum, ChainTypeEnum, type EmbeddedAccount, RecoveryMethod } from '@openfort/openfort-js'
import { useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { useOpenfort } from '../../../components/Openfort/useOpenfort'
import { queryKeys } from '../../../core/queryKeys'
import { useEmbeddedWallet } from '../../../hooks/useEmbeddedWallet'
import { useOpenfortCore } from '../../../openfort/useOpenfort'
import { useChain } from '../../../shared/hooks/useChain'
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
  const { chainType } = useChain()
  const { client } = useOpenfortCore()
  const { walletConfig } = useOpenfort()
  const chainId = walletConfig?.ethereum?.chainId ?? 80002
  const embeddedWallet = useEmbeddedWallet()
  const { signOut } = useSignOut()
  const queryClient = useQueryClient()

  const tryUseWallet = useCallback(
    async ({
      logoutOnError: signOutOnError = true,
      recoverWalletAutomatically,
    }: CreateWalletPostAuthOptions): Promise<{ wallet?: EthereumUserWallet | SolanaUserWallet }> => {
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

      const accountType =
        chainType === ChainTypeEnum.SVM
          ? undefined
          : walletConfig?.accountType === AccountTypeEnum.EOA
            ? undefined
            : AccountTypeEnum.SMART_ACCOUNT
      const wallets = await queryClient.ensureQueryData<EmbeddedAccount[]>({
        queryKey: queryKeys.accounts.embedded(accountType),
        queryFn: () =>
          client.embeddedWallet.list({
            limit: 100,
            accountType,
          }),
      })

      const chainWallets = wallets.filter((w) => w.chainType === chainType)

      if (chainWallets.length === 0) {
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

      const hasAutomaticOrPasskey = chainWallets.some(
        (w) => w.recoveryMethod === RecoveryMethod.AUTOMATIC || w.recoveryMethod === RecoveryMethod.PASSKEY
      )
      if (hasAutomaticOrPasskey) {
        const first = chainWallets[0]
        if (first) {
          try {
            if (embeddedWallet.chainType === ChainTypeEnum.SVM) {
              await embeddedWallet.setActive({ address: first.address })
            } else {
              await embeddedWallet.setActive({
                address: first.address as `0x${string}`,
                chainId,
              })
            }
            return {
              wallet:
                chainType === ChainTypeEnum.SVM
                  ? embeddedAccountToSolanaUserWallet(first)
                  : embeddedAccountToUserWallet(first),
            }
          } catch (err) {
            logger.error('Error recovering wallet:', err)
            if (signOutOnError) await signOut()
          }
        }
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
    [chainType, client, walletConfig, chainId, embeddedWallet, signOut, queryClient]
  )

  return {
    tryUseWallet,
  }
}
