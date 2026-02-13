/**
 * EVM wallet adapter hooks
 *
 * Implementations of wallet adapter interfaces using SDK/viem only (no wagmi).
 * Use these when running in evm-only mode (no WagmiProvider).
 */

import { ChainTypeEnum } from '@openfort/openfort-js'
import { useQuery } from '@tanstack/react-query'
import { useCallback, useMemo, useState } from 'react'
import { type Abi, createPublicClient, getAddress, http } from 'viem'
import { DEFAULT_TESTNET_CHAIN_ID } from '../core/ConnectionStrategy'
import { useCoreContext } from '../core/CoreContext'
import { OpenfortError, OpenfortErrorCode } from '../core/errors'
import { useEthereumWriteContract as useEthereumWriteContractInternal } from '../ethereum/hooks/useEthereumWriteContract'
import { signMessage as signMessageOp } from '../ethereum/operations'
import { useBalance as useBalanceHook } from '../hooks/useBalance'
import { useChains } from '../hooks/useChains'
import { useConnectedWallet } from '../hooks/useConnectedWallet'
import { useDisconnectAdapter } from '../hooks/useDisconnectAdapter'
import { useOpenfortCore } from '../openfort/useOpenfort'
import { useChain } from '../shared/hooks/useChain'
import { getDefaultEthereumRpcUrl } from '../utils/rpc'
import type {
  UseAccountLike,
  UseBalanceLike,
  UseDisconnectLike,
  UseReadContractLike,
  UseSignMessageLike,
  UseSwitchChainLike,
  UseWriteContractLike,
  WalletAdapterChain,
} from './types'

/**
 * Returns the connected EVM account. Use when not using wagmi (EVM-only mode).
 *
 * @returns address, chainId, and isConnected
 *
 * @example
 * ```tsx
 * const { address, chainId, isConnected } = useEthereumAccount()
 * ```
 */
export function useEthereumAccount(): UseAccountLike {
  const wallet = useConnectedWallet()
  const { chainType } = useChain()
  const isConnected = wallet.status === 'connected' && chainType === ChainTypeEnum.EVM && !!wallet.address
  return {
    address: isConnected ? (wallet.address as `0x${string}`) : undefined,
    chainId: isConnected ? wallet.chainId : undefined,
    isConnected,
  }
}

/**
 * Returns the native token balance for the connected EVM account.
 *
 * @returns data (value, formatted, symbol, decimals), refetch, isLoading, error
 *
 * @example
 * ```tsx
 * const { data, isLoading } = useEthereumBalance()
 * if (data) console.log(data.formatted, data.symbol)
 * ```
 */
export function useEthereumBalance(): UseBalanceLike {
  const { address, chainId, isConnected } = useEthereumAccount()
  const chainIdNum = chainId ?? DEFAULT_TESTNET_CHAIN_ID
  const balanceState = useBalanceHook({
    address: address ?? '',
    chainType: ChainTypeEnum.EVM,
    chainId: chainIdNum,
    enabled: isConnected && !!address,
  })

  const refetch = () => balanceState.refetch()

  if (!isConnected || !address) {
    return { data: undefined, refetch, isLoading: false }
  }

  if (balanceState.status === 'loading') {
    return { data: undefined, refetch, isLoading: true }
  }
  if (balanceState.status === 'error') {
    return { data: undefined, refetch, isLoading: false, error: balanceState.error }
  }
  if (balanceState.status === 'success') {
    return {
      data: {
        value: balanceState.value,
        formatted: balanceState.formatted,
        symbol: balanceState.symbol,
        decimals: balanceState.decimals,
      },
      refetch,
      isLoading: false,
    }
  }
  return { data: undefined, refetch, isLoading: false }
}

/**
 * Disconnects the wallet and logs out. Full logout (auth + wallet).
 *
 * @returns disconnect, disconnectAsync, isPending, error, reset
 */
export function useEthereumDisconnect(): UseDisconnectLike {
  return useDisconnectAdapter()
}

/**
 * Returns configured chains and switchChain for EVM multi-chain. Use when not using wagmi.
 *
 * @returns chains, currentChainId, switchChain, data, error, isPending
 *
 * @example
 * ```tsx
 * const { chains, switchChain } = useEthereumSwitchChain()
 * switchChain?.({ chainId: 84532 })
 * ```
 */
export function useEthereumSwitchChain(): UseSwitchChainLike {
  const chains = useChains()
  const { chainId: currentChainId } = useEthereumAccount()
  const { setActiveChainId } = useOpenfortCore()
  const [error, setError] = useState<Error | null>(null)
  const [isPending, setIsPending] = useState(false)

  const adapterChains: WalletAdapterChain[] = chains.map((c) => ({
    id: c.id,
    name: c.name ?? `Chain ${c.id}`,
    blockExplorers: c.blockExplorers,
  }))

  const data = useMemo(
    () => (currentChainId != null ? adapterChains.find((c) => c.id === currentChainId) : undefined),
    [adapterChains, currentChainId]
  )

  const switchChain = useCallback(
    async (params: { chainId: number }) => {
      const chain = adapterChains.find((c) => c.id === params.chainId)
      if (!chain) {
        setError(new Error(`Chain ${params.chainId} not found`))
        return
      }
      setError(null)
      setIsPending(true)
      try {
        setActiveChainId(params.chainId)
      } finally {
        setIsPending(false)
      }
    },
    [adapterChains, setActiveChainId]
  )

  return {
    chains: adapterChains,
    currentChainId,
    switchChain,
    data,
    error,
    isPending,
  }
}

/**
 * Signs a message with the connected EVM wallet.
 *
 * @returns signMessage(params), data, isPending, error
 *
 * @example
 * ```tsx
 * const { signMessage } = useEthereumSignMessage()
 * const sig = await signMessage({ message: 'Hello' })
 * ```
 */
export function useEthereumSignMessage(): UseSignMessageLike {
  const { client } = useOpenfortCore()
  const [data, setData] = useState<`0x${string}` | undefined>(undefined)
  const [error, setError] = useState<Error | null>(null)
  const [isPending, setIsPending] = useState(false)

  const signMessage = useCallback(
    async (params: { message: string }) => {
      setError(null)
      setIsPending(true)
      try {
        const sig = await signMessageOp({ message: params.message, client })
        setData(sig)
      } catch (err) {
        setError(err instanceof OpenfortError ? err : OpenfortError.from(err, OpenfortErrorCode.SIGNING_FAILED))
      } finally {
        setIsPending(false)
      }
    },
    [client]
  )

  return {
    data,
    signMessage,
    isPending,
    error,
  }
}

/** useReadContract-like: read one view function (address, abi, functionName, args) */
/**
 * Reads contract data. Use when not using wagmi.
 *
 * @param params - address, abi, functionName, args
 * @returns data, isLoading, error, refetch
 */
export function useEthereumReadContract(params: {
  address: `0x${string}`
  abi: Abi
  functionName: string
  args?: unknown[]
  chainId?: number
}): UseReadContractLike {
  const { config } = useCoreContext()
  const { chainId: connectedChainId } = useEthereumAccount()
  const chainId = params.chainId ?? connectedChainId ?? DEFAULT_TESTNET_CHAIN_ID
  const rpcUrl = config?.rpcUrls?.ethereum?.[chainId] ?? getDefaultEthereumRpcUrl(chainId)

  const query = useQuery({
    queryKey: ['readContract', params.address, params.functionName, params.args, chainId],
    enabled: !!params.address && !!params.functionName,
    queryFn: async () => {
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

/** useWriteContract-like: writeContract({ address, abi, functionName, args }) */
/**
 * Writes to a contract. Use when not using wagmi.
 *
 * @returns writeContract, data, isPending, error, reset
 *
 * @example
 * ```tsx
 * const { writeContract } = useEthereumWriteContract()
 * await writeContract({ address, abi, functionName: 'mint', args: [] })
 * ```
 */
export function useEthereumWriteContract(): UseWriteContractLike {
  const { address, chainId } = useEthereumAccount()
  const { writeContractAsync, data, isPending, error } = useEthereumWriteContractInternal()

  const writeContract = useCallback(
    (params: { address: `0x${string}`; abi: unknown[]; functionName: string; args?: unknown[] }) => {
      if (!address) return Promise.reject(new Error('Wallet not connected'))
      return writeContractAsync({
        address: getAddress(params.address),
        abi: params.abi as Abi,
        functionName: params.functionName,
        args: params.args,
        chainId: chainId,
      })
    },
    [address, chainId, writeContractAsync]
  )

  return {
    data,
    writeContract,
    isPending,
    error,
  }
}
