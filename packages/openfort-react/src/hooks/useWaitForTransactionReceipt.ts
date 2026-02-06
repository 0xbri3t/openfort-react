/**
 * useWaitForTransactionReceipt Hook
 *
 * Hook for waiting for transaction confirmation using viem.
 * Wagmi-free - uses viem's public client for polling.
 */

import { useQuery } from '@tanstack/react-query'
import { useContext } from 'react'
import { createPublicClient, http, type TransactionReceipt } from 'viem'

import { useCoreContext } from '../core/CoreContext'
import { EthereumContext } from '../ethereum/EthereumContext'
import { getDefaultEthereumRpcUrl } from '../utils/rpc'

export interface UseWaitForTransactionReceiptOptions {
  /** Transaction hash to wait for */
  hash: `0x${string}` | undefined
  /** Chain ID (optional, uses context if not provided) */
  chainId?: number
  /** Number of confirmations to wait for (default: 1) */
  confirmations?: number
  /** Enable/disable the query */
  enabled?: boolean
  /** Polling interval in ms (default: 4000) */
  pollingInterval?: number
}

/**
 * Transaction receipt state - discriminated union
 */
export type WaitForTransactionReceiptState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; error: Error }
  | { status: 'success'; data: TransactionReceipt; isSuccess: boolean; isError: boolean }

/**
 * Hook for waiting for transaction confirmation.
 *
 * Uses viem's public client for polling transaction receipt.
 *
 * @example Basic usage
 * ```tsx
 * function TransactionStatus({ hash }: { hash: `0x${string}` }) {
 *   const receipt = useWaitForTransactionReceipt({ hash });
 *
 *   switch (receipt.status) {
 *     case 'idle':
 *       return <p>No transaction</p>;
 *     case 'loading':
 *       return <p>Waiting for confirmation...</p>;
 *     case 'error':
 *       return <p>Error: {receipt.error.message}</p>;
 *     case 'success':
 *       return <p>Confirmed in block {receipt.data.blockNumber}</p>;
 *   }
 * }
 * ```
 */
export function useWaitForTransactionReceipt(
  options: UseWaitForTransactionReceiptOptions
): WaitForTransactionReceiptState {
  const { hash, chainId: optionChainId, confirmations = 1, enabled = true, pollingInterval = 4000 } = options

  const { config } = useCoreContext()
  const ethereumContext = useContext(EthereumContext)

  // Get chainId: option > context > default (1)
  const chainId = optionChainId ?? ethereumContext?.chainId ?? 1
  const rpcUrl = config.rpcUrls?.ethereum?.[chainId] ?? getDefaultEthereumRpcUrl(chainId)

  const isEnabled = enabled && !!hash

  const query = useQuery({
    queryKey: ['transactionReceipt', hash, chainId, confirmations],
    queryFn: async (): Promise<TransactionReceipt> => {
      if (!hash) throw new Error('No transaction hash provided')

      const client = createPublicClient({ transport: http(rpcUrl) })

      // Wait for transaction receipt with confirmations
      const receipt = await client.waitForTransactionReceipt({
        hash,
        confirmations,
        pollingInterval,
      })

      return receipt
    },
    enabled: isEnabled,
    retry: false, // Don't retry on error - transaction might be pending
    staleTime: Infinity, // Receipt never changes once received
  })

  // Discriminated union return
  if (!isEnabled) {
    return { status: 'idle' }
  }

  if (query.isLoading || query.isPending) {
    return { status: 'loading' }
  }

  if (query.error) {
    return { status: 'error', error: query.error as Error }
  }

  if (query.data) {
    const isSuccess = query.data.status === 'success'
    const isError = query.data.status === 'reverted'
    return {
      status: 'success',
      data: query.data,
      isSuccess,
      isError,
    }
  }

  return { status: 'loading' }
}
