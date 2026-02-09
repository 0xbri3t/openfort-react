import { useQuery } from '@tanstack/react-query'
import { useContext } from 'react'
import { createPublicClient, http, type TransactionReceipt } from 'viem'

import { useCoreContext } from '../../core/CoreContext'
import { getDefaultEthereumRpcUrl } from '../../utils/rpc'
import { EthereumContext } from '../EthereumContext'

export interface UseEthereumWaitForTransactionReceiptOptions {
  hash: `0x${string}` | undefined
  chainId?: number
  confirmations?: number
  enabled?: boolean
  pollingInterval?: number
}

export type EthereumWaitForTransactionReceiptState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; error: Error }
  | { status: 'success'; data: TransactionReceipt; isSuccess: boolean; isError: boolean }

export function useEthereumWaitForTransactionReceipt(
  options: UseEthereumWaitForTransactionReceiptOptions
): EthereumWaitForTransactionReceiptState {
  const { hash, chainId: optionChainId, confirmations = 1, enabled = true, pollingInterval = 4000 } = options

  const { config } = useCoreContext()
  const ethereumContext = useContext(EthereumContext)

  const chainId = optionChainId ?? ethereumContext?.chainId ?? 1
  const rpcUrl = config.rpcUrls?.ethereum?.[chainId] ?? getDefaultEthereumRpcUrl(chainId)

  const isEnabled = enabled && !!hash

  const query = useQuery({
    queryKey: ['ethereumTransactionReceipt', hash, chainId, confirmations],
    queryFn: async (): Promise<TransactionReceipt> => {
      if (!hash) throw new Error('No transaction hash provided')

      const client = createPublicClient({ transport: http(rpcUrl) })

      const receipt = await client.waitForTransactionReceipt({
        hash,
        confirmations,
        pollingInterval,
      })

      return receipt
    },
    enabled: isEnabled,
    retry: false,
    staleTime: Infinity,
  })

  if (!isEnabled) return { status: 'idle' }
  if (query.isLoading || query.isPending) return { status: 'loading' }
  if (query.error) return { status: 'error', error: query.error as Error }

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
