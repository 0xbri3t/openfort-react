/**
 * useTokenBalance Hook
 *
 * Hook for fetching ERC20 token balances using viem.
 * Wagmi-free - uses viem's public client for reading contracts.
 *
 * @see Phase E3
 */

import { useQuery } from '@tanstack/react-query'
import { useContext } from 'react'
import { createPublicClient, formatUnits, http, parseAbi } from 'viem'

import { useCoreContext } from '../core/CoreContext'
import { EthereumContext } from '../ethereum/EthereumContext'
import { getDefaultEthereumRpcUrl } from '../utils/rpc'

// =============================================================================
// Types
// =============================================================================

export interface UseTokenBalanceOptions {
  /** Token contract address (omit or null when not fetching ERC20, e.g. native send) */
  tokenAddress?: `0x${string}` | null
  /** Owner address to check balance for */
  ownerAddress: `0x${string}` | undefined
  /** Token decimals (optional, will fetch if not provided) */
  decimals?: number
  /** Chain ID (optional, uses context if not provided) */
  chainId?: number
  /** Enable/disable the query */
  enabled?: boolean
  /** Refetch interval in ms (default: 30000) */
  refetchInterval?: number
}

/**
 * Token balance state - discriminated union with refetch
 */
export type TokenBalanceState =
  | { status: 'idle'; refetch: () => void }
  | { status: 'loading'; refetch: () => void }
  | { status: 'error'; error: Error; refetch: () => void }
  | { status: 'success'; value: bigint; formatted: string; decimals: number; refetch: () => void }

// =============================================================================
// Constants
// =============================================================================

const erc20Abi = parseAbi([
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
])

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Hook for fetching ERC20 token balances.
 *
 * Uses viem for contract reads. Includes refetch for manual refresh.
 *
 * @example Basic usage
 * ```tsx
 * function TokenBalance({ tokenAddress, ownerAddress }: {
 *   tokenAddress: `0x${string}`;
 *   ownerAddress: `0x${string}`;
 * }) {
 *   const balance = useTokenBalance({
 *     tokenAddress,
 *     ownerAddress,
 *     decimals: 18, // Optional, will fetch if not provided
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
 *           Balance: {balance.formatted}
 *           <button onClick={balance.refetch}>Refresh</button>
 *         </p>
 *       );
 *   }
 * }
 * ```
 */
export function useTokenBalance(options: UseTokenBalanceOptions): TokenBalanceState {
  const {
    tokenAddress,
    ownerAddress,
    decimals: providedDecimals,
    chainId: optionChainId,
    enabled = true,
    refetchInterval = 30_000,
  } = options

  const { config } = useCoreContext()
  const ethereumContext = useContext(EthereumContext)

  // Get chainId: option > context > default (1)
  const chainId = optionChainId ?? ethereumContext?.chainId ?? 1
  const rpcUrl = config.rpcUrls?.ethereum?.[chainId] ?? getDefaultEthereumRpcUrl(chainId)

  const isEnabled = enabled && !!tokenAddress && !!ownerAddress

  const query = useQuery({
    queryKey: ['tokenBalance', tokenAddress ?? null, ownerAddress, chainId],
    queryFn: async () => {
      if (!tokenAddress) throw new Error('No token address provided')
      if (!ownerAddress) throw new Error('No owner address provided')

      const client = createPublicClient({ transport: http(rpcUrl) })

      // Fetch balance and decimals in parallel if decimals not provided
      const [balance, decimals] = await Promise.all([
        client.readContract({
          address: tokenAddress,
          abi: erc20Abi,
          functionName: 'balanceOf',
          args: [ownerAddress],
        }),
        providedDecimals !== undefined
          ? Promise.resolve(providedDecimals)
          : client.readContract({
              address: tokenAddress,
              abi: erc20Abi,
              functionName: 'decimals',
            }),
      ])

      const value = balance as bigint
      const dec = Number(decimals)

      return {
        value,
        formatted: formatUnits(value, dec),
        decimals: dec,
      }
    },
    enabled: isEnabled,
    refetchInterval,
  })

  const refetch = query.refetch

  // Discriminated union return
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
    decimals: query.data?.decimals ?? 18,
    refetch,
  }
}
