/**
 * useBalance Hook
 *
 * Fetch native token balance using viem.
 * Uses registry pattern for chain-specific balance fetching.
 *
 * @see Phase E1.5
 */

import { useQuery } from '@tanstack/react-query'
import { createPublicClient, formatEther, http } from 'viem'

import { useCoreContext } from '../core/CoreContext'
import { lamportsToSol } from '../solana/hooks/utils'
import type { ChainType, SolanaCluster } from '../utils/chains'
import { getDefaultEthereumRpcUrl, getDefaultSolanaRpcUrl, getNativeCurrency } from '../utils/rpc'

// =============================================================================
// Types
// =============================================================================

/**
 * Balance state - discriminated union with refetch in all states
 */
export type BalanceState =
  | { status: 'idle'; refetch: () => void }
  | { status: 'loading'; refetch: () => void }
  | { status: 'error'; error: Error; refetch: () => void }
  | { status: 'success'; value: bigint; formatted: string; symbol: string; decimals: number; refetch: () => void }

export interface UseBalanceOptions {
  /** Address to fetch balance for */
  address: string
  /** Chain type */
  chainType: ChainType
  /** Ethereum chain ID (default: 1) */
  chainId?: number
  /** Solana cluster (default: mainnet-beta) */
  cluster?: SolanaCluster
  /** Solana commitment level (default: confirmed) */
  commitment?: 'processed' | 'confirmed' | 'finalized'
  /** Enable/disable the query */
  enabled?: boolean
  /** Refetch interval in ms (default: 30000) */
  refetchInterval?: number
}

// =============================================================================
// Balance Fetchers (Registry Pattern)
// =============================================================================

type BalanceResult = { value: bigint; formatted: string; symbol: string; decimals: number }
type BalanceFetcher = (address: string, rpcUrl: string, commitment?: string) => Promise<BalanceResult>

const balanceFetchers: Record<ChainType, (chainId: number, cluster: SolanaCluster) => BalanceFetcher> = {
  ethereum: (chainId) => async (address, rpcUrl) => {
    const client = createPublicClient({ transport: http(rpcUrl) })
    const balance = await client.getBalance({ address: address as `0x${string}` })
    const { symbol, decimals } = getNativeCurrency(chainId)
    return {
      value: balance,
      formatted: formatEther(balance),
      symbol,
      decimals,
    }
  },

  solana:
    () =>
    async (address, rpcUrl, commitment = 'confirmed') => {
      // Use fetch-based RPC call (no @solana/web3.js dependency)
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

      if (!response.ok) {
        throw new Error(`RPC request failed: ${response.statusText}`)
      }

      const data = await response.json()
      if (data.error) {
        throw new Error(data.error.message || 'RPC error')
      }

      const lamports = BigInt(data.result.value)
      return {
        value: lamports,
        formatted: lamportsToSol(lamports).toFixed(9),
        symbol: 'SOL',
        decimals: 9,
      }
    },
}

// RPC URL resolvers (registry pattern)
const rpcResolvers: Record<
  ChainType,
  (
    config: { rpcUrls?: { ethereum?: Record<number, string>; solana?: Record<string, string> } },
    chainId: number,
    cluster: SolanaCluster
  ) => string
> = {
  ethereum: (config, chainId) => config.rpcUrls?.ethereum?.[chainId] ?? getDefaultEthereumRpcUrl(chainId),
  solana: (config, _chainId, cluster) => config.rpcUrls?.solana?.[cluster] ?? getDefaultSolanaRpcUrl(cluster),
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Hook for fetching native token balance.
 *
 * Uses registry pattern for chain-specific balance fetching.
 * Includes refetch in all states for manual refresh.
 *
 * @example Basic usage
 * ```tsx
 * function Balance({ address }: { address: string }) {
 *   const balance = useBalance({
 *     address,
 *     chainType: 'ethereum',
 *     chainId: 1,
 *   });
 *
 *   switch (balance.status) {
 *     case 'idle':
 *       return null;
 *     case 'loading':
 *       return <p>Loading...</p>;
 *     case 'error':
 *       return <p>Error: {balance.error.message}</p>;
 *     case 'success':
 *       return (
 *         <p>
 *           {balance.formatted} {balance.symbol}
 *           <button onClick={balance.refetch}>Refresh</button>
 *         </p>
 *       );
 *   }
 * }
 * ```
 */
export function useBalance(options: UseBalanceOptions): BalanceState {
  const {
    address,
    chainType,
    chainId = 1,
    cluster = 'mainnet-beta',
    commitment = 'confirmed',
    enabled = true,
    refetchInterval = 30_000,
  } = options

  const { config } = useCoreContext()

  // Get RPC URL using registry pattern (no if/else)
  const rpcUrl = rpcResolvers[chainType](config, chainId, cluster)

  const isEnabled = enabled && !!address && address.length > 0

  const query = useQuery({
    queryKey: ['balance', chainType, address, chainId, cluster],
    queryFn: () => balanceFetchers[chainType](chainId, cluster)(address, rpcUrl, commitment),
    enabled: isEnabled,
    refetchInterval,
  })

  const refetch = query.refetch

  // Discriminated union return - status-based
  if (!isEnabled) {
    return { status: 'idle', refetch }
  }

  if (query.isLoading || query.isPending) {
    return { status: 'loading', refetch }
  }

  if (query.error) {
    return { status: 'error', error: query.error as Error, refetch }
  }

  return {
    status: 'success',
    value: query.data?.value ?? BigInt(0),
    formatted: query.data?.formatted ?? '0',
    symbol: query.data?.symbol ?? '',
    decimals: query.data?.decimals ?? 18,
    refetch,
  }
}
