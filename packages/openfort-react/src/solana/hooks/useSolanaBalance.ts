import { ChainTypeEnum } from '@openfort/openfort-js'
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '../../core/queryKeys'
import { useConnectedWallet } from '../../hooks/useConnectedWallet'
import { useChain } from '../../shared/hooks/useChain'
import type { UseBalanceLike } from '../../wallet-adapters/types'
import { useSolanaContext } from '../SolanaContext'
import { lamportsToSol } from './utils'

export type UseSolanaBalanceParams = {
  address?: string
  enabled?: boolean
  refetchInterval?: number
}

function useSolanaBalanceQuery(address: string | undefined, options?: { enabled?: boolean; refetchInterval?: number }) {
  const { rpcUrl, commitment } = useSolanaContext()
  return useQuery({
    queryKey: queryKeys.solana.balance(address, rpcUrl, commitment),
    queryFn: async () => {
      if (!address) throw new Error('Address is required')
      const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getBalance',
          params: [address, { commitment }],
        }),
      })
      if (!response.ok) throw new Error(`RPC request failed: ${response.statusText}`)
      const data = await response.json()
      if (data.error) throw new Error(data.error.message || 'RPC error')
      return BigInt(data.result.value)
    },
    enabled: !!address && (options?.enabled ?? true),
    staleTime: 4000,
    refetchInterval: options?.refetchInterval,
    retry: 2,
  })
}

/**
 * Returns SOL balance for an address. Omit params to use the connected wallet address.
 *
 * @param params - Optional { address } to query a specific address
 * @returns data (value, formatted, symbol, decimals), refetch, isLoading, error
 *
 * @example
 * ```tsx
 * const { data } = useSolanaBalance({ address: walletAddress })
 * if (data) console.log(data.formatted, 'SOL')
 * ```
 */
export function useSolanaBalance(params?: UseSolanaBalanceParams): UseBalanceLike {
  const { address: paramAddress, enabled = true, refetchInterval } = params ?? {}
  const wallet = useConnectedWallet()
  const { chainType } = useChain()
  const connectedAddress = chainType === ChainTypeEnum.SVM && wallet.status === 'connected' ? wallet.address : undefined
  const address = paramAddress ?? connectedAddress
  const isConnected = !!connectedAddress && chainType === ChainTypeEnum.SVM
  const query = useSolanaBalanceQuery(address, {
    enabled: paramAddress !== undefined ? !!address && enabled : isConnected && !!address && enabled,
    refetchInterval,
  })
  const refetchCb = () => query.refetch()
  return {
    data:
      query.data !== undefined
        ? {
            value: query.data,
            formatted: lamportsToSol(query.data).toFixed(9),
            symbol: 'SOL',
            decimals: 9,
          }
        : undefined,
    refetch: refetchCb,
    isLoading: query.isLoading || query.isPending,
    error: query.error ?? null,
  }
}
