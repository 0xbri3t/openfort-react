import { useQuery } from '@tanstack/react-query'
import { createPublicClient, formatEther, http } from 'viem'

import { useCoreContext } from '../../core/CoreContext'
import { getDefaultEthereumRpcUrl } from '../../utils/rpc'

export type EthereumGasEstimate =
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

export interface UseEthereumGasEstimateOptions {
  to: `0x${string}`
  value?: bigint
  data?: `0x${string}`
  from?: `0x${string}`
  chainId?: number
  enabled?: boolean
}

export function useEthereumGasEstimate(options: UseEthereumGasEstimateOptions): EthereumGasEstimate {
  const { to, value = BigInt(0), data = '0x', from, chainId = 80002, enabled = true } = options

  const { config } = useCoreContext()
  const rpcUrl = config.rpcUrls?.ethereum?.[chainId] ?? getDefaultEthereumRpcUrl(chainId)

  const isEnabled = enabled && !!from && !!to

  const query = useQuery({
    queryKey: ['ethereumGasEstimate', to, value.toString(), data, chainId, from],
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
    staleTime: 10_000,
  })

  const refetch = query.refetch

  if (!isEnabled) return { status: 'idle', refetch }
  if (query.isLoading || query.isPending) return { status: 'loading', refetch }
  if (query.error) return { status: 'error', error: query.error as Error, refetch }

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
