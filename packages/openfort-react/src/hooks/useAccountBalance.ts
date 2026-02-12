import { ChainTypeEnum } from '@openfort/openfort-js'
import { useMemo } from 'react'
import { DEFAULT_TESTNET_CHAIN_ID } from '../core/ConnectionStrategy'
import { useChain } from '../shared/hooks/useChain'
import { useBalance } from './useBalance'
import { useConnectedWallet } from './useConnectedWallet'

export type UseAccountBalanceReturnType = {
  data: { value: bigint; formatted: string; symbol: string; decimals: number } | undefined
  isLoading: boolean
  isPending: boolean
  isError: boolean
  isSuccess: boolean
  error: Error | null
  refetch: () => void
}

/**
 * Wagmi-compatible balance hook for the connected account. Uses the current
 * wallet address and chain from useConnectedWallet() and returns a flat
 * data + flags shape. Works in both bridge and embedded mode.
 *
 * @deprecated Use @openfort/wagmi for wagmi integration. For EVM-only (no wagmi), use `useEthereumBalance`.
 *
 * @example
 * ```tsx
 * const { data, isLoading, isError, refetch } = useAccountBalance()
 * if (data) {
 *   console.log('Balance:', data.formatted, data.symbol)
 * }
 * ```
 */
export function useAccountBalance(): UseAccountBalanceReturnType {
  const { isEvm } = useChain()
  const wallet = useConnectedWallet()
  const address = isEvm && wallet.status === 'connected' ? wallet.address : undefined
  const chainId =
    isEvm && wallet.status === 'connected' ? (wallet.chainId ?? DEFAULT_TESTNET_CHAIN_ID) : DEFAULT_TESTNET_CHAIN_ID

  const balanceState = useBalance({
    address: address ?? '',
    chainType: ChainTypeEnum.EVM,
    chainId,
    enabled: isEvm && !!address,
  })

  const refetch = balanceState.refetch

  return useMemo(() => {
    if (balanceState.status === 'idle') {
      return {
        data: undefined,
        isLoading: false,
        isPending: false,
        isError: false,
        isSuccess: false,
        error: null,
        refetch,
      }
    }
    if (balanceState.status === 'loading') {
      return {
        data: undefined,
        isLoading: true,
        isPending: true,
        isError: false,
        isSuccess: false,
        error: null,
        refetch,
      }
    }
    if (balanceState.status === 'error') {
      return {
        data: undefined,
        isLoading: false,
        isPending: false,
        isError: true,
        isSuccess: false,
        error: balanceState.error,
        refetch,
      }
    }
    return {
      data: {
        value: balanceState.value,
        formatted: balanceState.formatted,
        symbol: balanceState.symbol,
        decimals: balanceState.decimals,
      },
      isLoading: false,
      isPending: false,
      isError: false,
      isSuccess: true,
      error: null,
      refetch,
    }
  }, [balanceState, refetch])
}
