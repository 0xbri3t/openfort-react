/**
 * Hook for embedded wallet accounts
 *
 * Provides access to the list of embedded wallet accounts for the current user.
 */

import type { ChainTypeEnum, EmbeddedAccount } from '@openfort/openfort-js'
import { useMemo } from 'react'

import { useAuthContext } from '../AuthContext'

/**
 * Return type for useEmbeddedAccounts hook
 */
export type UseEmbeddedAccountsReturn = {
  /** All embedded accounts */
  accounts: EmbeddedAccount[]

  /** Whether accounts are loading */
  isLoading: boolean

  /** Refetch accounts from server */
  refetch: () => Promise<void>

  /** Filter accounts by chain type */
  filterByChain: (chainType: ChainTypeEnum) => EmbeddedAccount[]
}

/**
 * Access embedded wallet accounts
 *
 * Provides the list of embedded wallet accounts associated with the current user.
 * Use this hook to display wallet options or manage multiple wallets.
 *
 * @returns Embedded accounts list and utilities
 * @throws ProviderNotFoundError if not within OpenfortProvider
 *
 * @example
 * ```tsx
 * import { ChainTypeEnum } from '@openfort/openfort-js'
 *
 * function WalletList() {
 *   const { accounts, isLoading, filterByChain } = useEmbeddedAccounts()
 *
 *   if (isLoading) return <Spinner />
 *
 *   const ethWallets = filterByChain(ChainTypeEnum.EVM)
 *   const solWallets = filterByChain(ChainTypeEnum.SVM)
 *
 *   return (
 *     <div>
 *       <h3>Ethereum Wallets</h3>
 *       {ethWallets.map(w => <WalletCard key={w.id} wallet={w} />)}
 *
 *       <h3>Solana Wallets</h3>
 *       {solWallets.map(w => <WalletCard key={w.id} wallet={w} />)}
 *     </div>
 *   )
 * }
 * ```
 */
export function useEmbeddedAccounts(): UseEmbeddedAccountsReturn {
  const { embeddedAccounts, isLoadingAccounts, refetchAccounts } = useAuthContext()

  const accounts = embeddedAccounts ?? []

  const filterByChain = useMemo(() => {
    return (chainType: ChainTypeEnum): EmbeddedAccount[] => {
      return accounts.filter((acc) => acc.chainType === chainType)
    }
  }, [accounts])

  return {
    accounts,
    isLoading: isLoadingAccounts,
    refetch: refetchAccounts,
    filterByChain,
  }
}
