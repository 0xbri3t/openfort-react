/**
 * useGasEstimate Hook
 *
 * Estimate gas costs for Ethereum transactions using viem.
 * Includes refetch for fresh estimates before confirming transactions.
 *
 * @see Phase E1.6
 */

import { useQuery } from '@tanstack/react-query'
import { createPublicClient, formatEther, http } from 'viem'

import { useCoreContext } from '../core/CoreContext'
import { getDefaultEthereumRpcUrl } from '../utils/rpc'

// =============================================================================
// Types
// =============================================================================

/**
 * Gas estimate state - discriminated union with refetch in all states
 */
export type GasEstimate =
  | { status: 'idle'; refetch: () => void }
  | { status: 'loading'; refetch: () => void }
  | { status: 'error'; error: Error; refetch: () => void }
  | {
      status: 'success'
      gasLimit: bigint
      maxFeePerGas: bigint
      maxPriorityFeePerGas: bigint
      estimatedCost: bigint
      formattedCost: string
      refetch: () => void
    }

export interface UseGasEstimateOptions {
  /** Target address */
  to: `0x${string}`
  /** Transaction value in wei */
  value?: bigint
  /** Transaction data */
  data?: `0x${string}`
  /** From address (required for estimation) */
  from?: `0x${string}`
  /** Chain ID (default: 1) */
  chainId?: number
  /** Enable/disable the query */
  enabled?: boolean
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Hook for estimating gas costs for Ethereum transactions.
 *
 * Uses viem for gas estimation. Includes refetch for fresh estimates
 * before confirming transactions.
 *
 * @example Basic usage
 * ```tsx
 * function SendConfirmation({ to, value, from }: { to: `0x${string}`; value: bigint; from: `0x${string}` }) {
 *   const gas = useGasEstimate({ to, value, from });
 *
 *   switch (gas.status) {
 *     case 'idle':
 *       return null;
 *     case 'loading':
 *       return <p>Estimating gas...</p>;
 *     case 'error':
 *       return <p>Error: {gas.error.message}</p>;
 *     case 'success':
 *       return (
 *         <div>
 *           <p>Estimated cost: {gas.formattedCost} ETH</p>
 *           <button onClick={gas.refetch}>Refresh estimate</button>
 *         </div>
 *       );
 *   }
 * }
 * ```
 */
export function useGasEstimate(options: UseGasEstimateOptions): GasEstimate {
  const { to, value = BigInt(0), data = '0x', from, chainId = 1, enabled = true } = options

  const { config } = useCoreContext()
  const rpcUrl = config.rpcUrls?.ethereum?.[chainId] ?? getDefaultEthereumRpcUrl(chainId)

  // Define enabled state
  const isEnabled = enabled && !!from && !!to

  const query = useQuery({
    queryKey: ['gasEstimate', to, value.toString(), data, chainId, from],
    queryFn: async () => {
      const client = createPublicClient({ transport: http(rpcUrl) })

      const [gasLimit, feeData] = await Promise.all([
        client.estimateGas({
          account: from,
          to,
          value,
          data,
        }),
        client.estimateFeesPerGas(),
      ])

      const maxFeePerGas = feeData.maxFeePerGas ?? BigInt(0)
      const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas ?? BigInt(0)
      const estimatedCost = gasLimit * maxFeePerGas

      return {
        gasLimit,
        maxFeePerGas,
        maxPriorityFeePerGas,
        estimatedCost,
        formattedCost: formatEther(estimatedCost),
      }
    },
    enabled: isEnabled,
    staleTime: 10_000, // 10 seconds
  })

  const refetch = query.refetch

  // Discriminated union return - status-based (includes refetch for fresh estimates)
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
    gasLimit: query.data?.gasLimit ?? BigInt(0),
    maxFeePerGas: query.data?.maxFeePerGas ?? BigInt(0),
    maxPriorityFeePerGas: query.data?.maxPriorityFeePerGas ?? BigInt(0),
    estimatedCost: query.data?.estimatedCost ?? BigInt(0),
    formattedCost: query.data?.formattedCost ?? '0',
    refetch,
  }
}
