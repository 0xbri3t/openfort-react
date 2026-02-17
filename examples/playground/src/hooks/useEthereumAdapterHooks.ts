/**
 * Local EVM adapter hooks for playground (evm-only mode)
 * These are examples of how to implement wallet adapter hooks without the SDK.
 * In production, use wagmi hooks or viem directly.
 */

import { ChainTypeEnum, useChain, useEthereumEmbeddedWallet } from '@openfort/react'
import { useQuery } from '@tanstack/react-query'
import { useCallback, useState } from 'react'
import { type Abi, createPublicClient, http } from 'viem'

export interface UseAccountLike {
  address?: `0x${string}`
  chainId?: number
  isConnected: boolean
}

export interface UseBalanceLike {
  data?: {
    value: bigint
    formatted: string
    symbol: string
    decimals: number
  }
  refetch: () => void
  isLoading: boolean
  error?: Error | null
}

export interface UseReadContractLike {
  data?: unknown
  refetch: () => void
  error: Error | null
  isLoading: boolean
}

export interface UseWriteContractLike {
  data?: `0x${string}`
  writeContract: (params: {
    address: `0x${string}`
    abi: unknown[]
    functionName: string
    args?: unknown[]
  }) => Promise<`0x${string}`>
  isPending: boolean
  isLoading: boolean
  isError: boolean
  isSuccess: boolean
  error?: Error | null
}

/**
 * Returns the connected EVM account.
 */
export function useEthereumAccountLocal(): UseAccountLike {
  const { chainType } = useChain()
  const wallet = useEthereumEmbeddedWallet()
  const isConnected = wallet.status === 'connected' && chainType === ChainTypeEnum.EVM && !!wallet.address
  return {
    address: isConnected ? (wallet.address as `0x${string}`) : undefined,
    chainId: isConnected ? wallet.chainId : undefined,
    isConnected,
  }
}

/**
 * Reads contract data (view function).
 */
export function useEthereumReadContractLocal(params: {
  address: `0x${string}`
  abi: Abi
  functionName: string
  args?: unknown[]
  chainId?: number
}): UseReadContractLike {
  const { chainId: connectedChainId } = useEthereumAccountLocal()
  const chainId = params.chainId ?? connectedChainId ?? 11155111 // Sepolia default

  const query = useQuery({
    queryKey: ['readContract', params.address, params.functionName, params.args, chainId],
    enabled: !!params.address && !!params.functionName,
    queryFn: async () => {
      const rpcUrl = 'https://sepolia.base.org'
      const client = createPublicClient({ transport: http(rpcUrl) })
      return client.readContract({
        address: params.address,
        abi: params.abi,
        functionName: params.functionName,
        args: params.args as readonly unknown[] | undefined,
      })
    },
  })

  return {
    data: query.data,
    refetch: query.refetch,
    error: query.error as Error | null,
    isLoading: query.isLoading || query.isPending,
  }
}

/**
 * Writes to a contract.
 */
export function useEthereumWriteContractLocal(): UseWriteContractLike {
  const { address, chainId } = useEthereumAccountLocal()
  const [data, setData] = useState<`0x${string}` | undefined>(undefined)
  const [isPending, setIsPending] = useState(false)
  const [isError, setIsError] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const writeContract = useCallback(
    async (_params: { address: `0x${string}`; abi: unknown[]; functionName: string; args?: unknown[] }) => {
      if (!address) return Promise.reject(new Error('Wallet not connected'))

      setIsPending(true)
      setIsError(false)
      setIsSuccess(false)
      setError(null)

      try {
        // Mock: return a dummy tx hash
        // In production, use wagmi or viem to actually write to contract
        const mockHash = `0x${Math.random().toString(16).slice(2)}` as `0x${string}`
        setData(mockHash)
        setIsSuccess(true)
        return mockHash
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err))
        setError(e)
        setIsError(true)
        throw e
      } finally {
        setIsPending(false)
      }
    },
    [address, chainId]
  )

  return {
    data,
    writeContract,
    isPending,
    isLoading: isPending,
    isError,
    isSuccess,
    error,
  }
}
