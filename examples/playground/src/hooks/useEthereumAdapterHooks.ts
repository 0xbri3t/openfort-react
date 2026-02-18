/**
 * Local EVM adapter hooks for playground (evm-only mode)
 * These are examples of how to implement wallet adapter hooks without the SDK.
 * In production, use wagmi hooks or viem directly.
 */

import { ChainTypeEnum, useChain, useEthereumEmbeddedWallet, useOpenfort } from '@openfort/react'
import { useQuery } from '@tanstack/react-query'
import { useCallback, useState } from 'react'
import { type Abi, createPublicClient, encodeFunctionData, http } from 'viem'

/** Default chain when no activeChainId (Beam Testnet). */
const DEFAULT_CHAIN_ID = 13337

/**
 * Maps chainId to RPC URL for playground chains
 */
export function getPlaygroundRpcUrl(chainId?: number): string {
  switch (chainId) {
    case 80002: // Polygon Amoy
      return 'https://rpc-amoy.polygon.technology'
    case 84532: // Base Sepolia
      return 'https://sepolia.base.org'
    case 13337: // Beam Testnet
      return 'https://build.onbeam.com/rpc/testnet'
    default:
      return 'https://build.onbeam.com/rpc/testnet' // Default to Beam Testnet
  }
}

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
 * When the embedded hook has not yet reached "connected", falls back to core.activeEmbeddedAddress
 * so sign/mint can work as soon as the user has an active embedded account.
 */
export function useEthereumAccount(): UseAccountLike {
  const { chainType } = useChain()
  const core = useOpenfort()
  const wallet = useEthereumEmbeddedWallet()

  const hookConnected = wallet.status === 'connected' && chainType === ChainTypeEnum.EVM && !!wallet.address
  if (hookConnected) {
    return {
      address: wallet.address as `0x${string}`,
      chainId: wallet.chainId,
      isConnected: true,
    }
  }

  const fallbackAddress = core.activeEmbeddedAddress
  const evmAccount =
    chainType === ChainTypeEnum.EVM &&
    fallbackAddress &&
    core.embeddedAccounts?.find(
      (a) => a.chainType === ChainTypeEnum.EVM && a.address.toLowerCase() === fallbackAddress.toLowerCase()
    )
  const useFallback = !!evmAccount
  const chainId = core.activeChainId ?? DEFAULT_CHAIN_ID

  return {
    address: useFallback ? (evmAccount.address as `0x${string}`) : undefined,
    chainId: useFallback ? chainId : undefined,
    isConnected: useFallback,
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
  const { chainId: connectedChainId } = useEthereumAccount()
  const chainId = params.chainId ?? connectedChainId

  const query = useQuery({
    queryKey: ['readContract', params.address, params.functionName, params.args, chainId],
    enabled: !!params.address && !!params.functionName && !!chainId,
    queryFn: async () => {
      const rpcUrl = getPlaygroundRpcUrl(chainId)
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
 * Uses embedded wallet provider (from hook when connected, or from core.client when fallback account).
 */
export function useEthereumWriteContractLocal(): UseWriteContractLike {
  const { address, chainId } = useEthereumAccount()
  const core = useOpenfort()
  const wallet = useEthereumEmbeddedWallet()
  const [data, setData] = useState<`0x${string}` | undefined>(undefined)
  const [isPending, setIsPending] = useState(false)
  const [isError, setIsError] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const writeContract = useCallback(
    async (params: { address: `0x${string}`; abi: unknown[]; functionName: string; args?: unknown[] }) => {
      if (!address) {
        const err = new Error('Wallet not connected')
        setError(err)
        setIsError(true)
        return Promise.reject(err)
      }

      setIsPending(true)
      setIsError(false)
      setIsSuccess(false)
      setError(null)

      try {
        const provider =
          wallet.status === 'connected' && wallet.activeWallet
            ? await wallet.activeWallet.getProvider()
            : await core.client.embeddedWallet.getEthereumProvider()

        const dataEncoded = encodeFunctionData({
          abi: params.abi as Abi,
          functionName: params.functionName,
          args: params.args,
        })

        const txHash = (await provider.request({
          method: 'eth_sendTransaction',
          params: [
            {
              from: address,
              to: params.address,
              data: dataEncoded,
            },
          ],
        })) as `0x${string}`

        setData(txHash)
        setIsSuccess(true)
        return txHash
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err))
        setError(e)
        setIsError(true)
        throw e
      } finally {
        setIsPending(false)
      }
    },
    [address, chainId, wallet.status, wallet.activeWallet, core.client]
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
