import { AccountTypeEnum, ChainTypeEnum, type EmbeddedAccount, RecoveryMethod } from '@openfort/openfort-js'
import { useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { useOpenfort } from '../../../components/Openfort/useOpenfort'
import { queryKeys } from '../../../core/queryKeys'
import { useEthereumEmbeddedWallet } from '../../../ethereum/hooks/useEthereumEmbeddedWallet'
import { useOpenfortCore } from '../../../openfort/useOpenfort'
import { useChain } from '../../../shared/hooks/useChain'
import { buildRecoveryParams } from '../../../shared/utils/recovery'
import { logger } from '../../../utils/logger'
import {
  type EthereumUserWallet,
  embeddedAccountToSolanaUserWallet,
  embeddedAccountToUserWallet,
  type SolanaUserWallet,
} from '../useWallets'
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
  const ethereum = useEthereumEmbeddedWallet({ chainId })
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
        // If there is no encryption session, we cannot create a wallet
        return {}
      }

      // SVM uses EOA list (Solana wallets are EOA); EVM uses walletConfig accountType
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

      // Solana: create SVM wallet when none exist; then refetch and return minimal wallet so caller sees success
      if (chainType === ChainTypeEnum.SVM) {
        let targetAccount: EmbeddedAccount | undefined = wallets.filter((w) => w.chainType === ChainTypeEnum.SVM)[0]
        if (!targetAccount) {
          try {
            logger.log('Solana mode: creating Solana wallet automatically')
            const recoveryParams = await buildRecoveryParams(undefined, {
              walletConfig,
              getAccessToken: () => client.getAccessToken(),
              getUserId: () => client.user.get().then((u) => u?.id),
            })
            await client.embeddedWallet.create({
              chainType: ChainTypeEnum.SVM,
              accountType: AccountTypeEnum.EOA,
              recoveryParams,
            })
            await queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all() })
            const refreshed = await queryClient.fetchQuery<EmbeddedAccount[]>({
              queryKey: queryKeys.accounts.embedded(undefined),
              queryFn: () => client.embeddedWallet.list({ limit: 100 }),
            })
            targetAccount = refreshed.find((w) => w.chainType === ChainTypeEnum.SVM)
            logger.log('Solana mode: Solana wallet created')
            await queryClient.refetchQueries({ queryKey: queryKeys.accounts.embedded(undefined) })
          } catch (err) {
            logger.error('Error creating Solana wallet:', err)
            if (signOutOnError) await signOut()
          }
        }
        if (targetAccount) {
          return { wallet: embeddedAccountToSolanaUserWallet(targetAccount) }
        }
        return {}
      }

      const evmWallets = wallets.filter((w) => w.chainType === ChainTypeEnum.EVM)
      let wallet: EthereumUserWallet | undefined

      if (evmWallets.length === 0) {
        try {
          const account = await ethereum.create()
          wallet = embeddedAccountToUserWallet(account)
        } catch (err) {
          logger.error('Error creating wallet:', err)
          if (signOutOnError) await signOut()
          return {}
        }
      }

      if (
        evmWallets.some(
          (w) => w.recoveryMethod === RecoveryMethod.AUTOMATIC || w.recoveryMethod === RecoveryMethod.PASSKEY
        )
      ) {
        const first = evmWallets[0]
        if (first) {
          try {
            await ethereum.setActive({ address: first.address as `0x${string}` })
            wallet = embeddedAccountToUserWallet(first)
          } catch (err) {
            logger.error('Error recovering wallet:', err)
            if (signOutOnError) await signOut()
          }
        }
      }

      if (!wallet && evmWallets.length > 0) {
        wallet = embeddedAccountToUserWallet(evmWallets[0])
      }
      return { wallet }
    },
    [chainType, client, walletConfig, ethereum, signOut, queryClient]
  )

  return {
    tryUseWallet,
  }
}
