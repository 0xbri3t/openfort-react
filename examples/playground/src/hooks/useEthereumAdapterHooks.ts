import { ChainTypeEnum, useChain, useEthereumEmbeddedWallet, useOpenfort } from '@openfort/react'
import { useQuery } from '@tanstack/react-query'
import { useCallback, useState } from 'react'
import { type Abi, createPublicClient, encodeFunctionData, http } from 'viem'
import { useAccount as useWagmiAccount, useWriteContract as useWagmiWriteContract } from 'wagmi'
import { usePlaygroundMode } from '@/providers'

/** Default chain when no activeChainId (Beam Testnet). */
const DEFAULT_CHAIN_ID = 13337

/**
 * Maps chainId to RPC URL for playground chains
 */
function getPlaygroundRpcUrl(chainId?: number): string {
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

export function useEthereumAccount(): UseAccountLike {
  const { mode } = usePlaygroundMode()
  const { chainType } = useChain()
  const core = useOpenfort()
  const wallet = useEthereumEmbeddedWallet()
  const wagmiAccount = useWagmiAccount()

  if (mode === 'evm-wagmi') {
    return {
      address: wagmiAccount.address,
      chainId: wagmiAccount.chainId,
      isConnected: wagmiAccount.isConnected,
    }
  }

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

type WriteParams = { address: `0x${string}`; abi: unknown[]; functionName: string; args?: unknown[] }

export function useEthereumWriteContractLocal(): UseWriteContractLike {
  const { mode } = usePlaygroundMode()
  const { address } = useEthereumAccount()
  const core = useOpenfort()
  const wallet = useEthereumEmbeddedWallet()

  const {
    writeContractAsync,
    data: wagmiData,
    isPending: wagmiPending,
    isError: wagmiIsError,
    isSuccess: wagmiIsSuccess,
    error: wagmiError,
  } = useWagmiWriteContract()

  const [data, setData] = useState<`0x${string}` | undefined>(undefined)
  const [isPending, setIsPending] = useState(false)
  const [isError, setIsError] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const writeContractEmbedded = useCallback(
    async (params: WriteParams) => {
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
          params: [{ from: address, to: params.address, data: dataEncoded }],
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
    [address, wallet.status, wallet.activeWallet, core.client]
  )

  const writeContractWagmi = useCallback(
    (params: WriteParams) =>
      writeContractAsync({
        address: params.address,
        abi: params.abi as Abi,
        functionName: params.functionName,
        args: params.args as readonly unknown[],
      }),
    [writeContractAsync]
  )

  if (mode === 'evm-wagmi') {
    return {
      data: wagmiData,
      writeContract: writeContractWagmi,
      isPending: wagmiPending,
      isLoading: wagmiPending,
      isError: wagmiIsError,
      isSuccess: wagmiIsSuccess,
      error: wagmiError as Error | null,
    }
  }

  return {
    data,
    writeContract: writeContractEmbedded,
    isPending,
    isLoading: isPending,
    isError,
    isSuccess,
    error,
  }
}
