import { useQuery } from '@tanstack/react-query'
import { useContext } from 'react'
import { createPublicClient, formatUnits, http, parseAbi } from 'viem'

import { useCoreContext } from '../../core/CoreContext'
import { getDefaultEthereumRpcUrl } from '../../utils/rpc'
import { EthereumContext } from '../EthereumContext'

export interface UseEthereumTokenBalanceOptions {
  tokenAddress?: `0x${string}` | null
  ownerAddress: `0x${string}` | undefined
  decimals?: number
  chainId?: number
  enabled?: boolean
  refetchInterval?: number
}

export type EthereumTokenBalanceState =
  | { status: 'idle'; refetch: () => void }
  | { status: 'loading'; refetch: () => void }
  | { status: 'error'; error: Error; refetch: () => void }
  | { status: 'success'; value: bigint; formatted: string; decimals: number; refetch: () => void }

const erc20Abi = parseAbi([
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
])

export function useEthereumTokenBalance(options: UseEthereumTokenBalanceOptions): EthereumTokenBalanceState {
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

  const chainId = optionChainId ?? ethereumContext?.chainId ?? 1
  const rpcUrl = config.rpcUrls?.ethereum?.[chainId] ?? getDefaultEthereumRpcUrl(chainId)

  const isEnabled = enabled && !!tokenAddress && !!ownerAddress

  const query = useQuery({
    queryKey: ['ethereumTokenBalance', tokenAddress ?? null, ownerAddress, chainId],
    queryFn: async () => {
      if (!tokenAddress) throw new Error('No token address provided')
      if (!ownerAddress) throw new Error('No owner address provided')

      const client = createPublicClient({ transport: http(rpcUrl) })

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

  if (!isEnabled) return { status: 'idle', refetch }
  if (query.isLoading || query.isPending) return { status: 'loading', refetch }
  if (query.error) return { status: 'error', error: query.error as Error, refetch }

  return {
    status: 'success',
    value: query.data?.value ?? BigInt(0),
    formatted: query.data?.formatted ?? '0',
    decimals: query.data?.decimals ?? 18,
    refetch,
  }
}
