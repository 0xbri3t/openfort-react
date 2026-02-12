/**
 * Solana Balance Hook (INTERNAL ONLY)
 *
 * Fetches SOL balance for a given address using the Solana RPC.
 * This hook is used internally by UI components and is NOT exported
 * from the public API.
 *
 * @internal
 */

import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '../../core/queryKeys'
import { useSolanaContext } from '../SolanaContext'
import { lamportsToSol } from './utils'

/**
 * Balance result type
 */
export interface SolanaBalanceResult {
  /** Balance in lamports (raw) */
  lamports: bigint
  /** Balance in SOL (formatted) */
  sol: number
}

/**
 * Hook options for useSolanaBalance
 */
export interface UseSolanaBalanceOptions {
  /** Whether to enable the query */
  enabled?: boolean
  /** Refetch interval in ms (default: no auto-refetch) */
  refetchInterval?: number
}

/**
 * Internal hook for fetching Solana balance
 *
 * Uses the RPC getBalance method with the configured commitment level.
 * Results are cached with a 4 second stale time (Solana slot time).
 *
 * @param address - Solana address (Base58) to fetch balance for
 * @param options - Query options
 * @returns Query result with balance data
 *
 * @internal This hook is not exported from the public API
 */
export function useSolanaBalance(address: string | undefined, options?: UseSolanaBalanceOptions) {
  const { rpcUrl, commitment } = useSolanaContext()

  return useQuery({
    queryKey: queryKeys.solana.balance(address, rpcUrl, commitment),
    queryFn: async (): Promise<SolanaBalanceResult> => {
      if (!address) {
        throw new Error('Address is required')
      }

      // Make RPC request to getBalance
      const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getBalance',
          params: [
            address,
            {
              commitment,
            },
          ],
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
        lamports,
        sol: lamportsToSol(lamports),
      }
    },
    enabled: !!address && (options?.enabled ?? true),
    staleTime: 4000, // Solana slot time (~400ms), use 4s for reasonable freshness
    refetchInterval: options?.refetchInterval,
    retry: 2,
  })
}
