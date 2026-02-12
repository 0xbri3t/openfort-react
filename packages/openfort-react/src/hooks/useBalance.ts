import { ChainTypeEnum } from '@openfort/openfort-js'
import { address, createSolanaRpc } from '@solana/kit'
import { useQuery } from '@tanstack/react-query'
import { createPublicClient, formatEther, http } from 'viem'
import { DEFAULT_TESTNET_CHAIN_ID } from '../core/ConnectionStrategy'
import { useCoreContext } from '../core/CoreContext'
import { lamportsToSol } from '../solana/hooks/utils'
import type { SolanaCluster } from '../solana/types'
import { getDefaultEthereumRpcUrl, getDefaultSolanaRpcUrl, getNativeCurrency } from '../utils/rpc'

export type BalanceState =
  | { status: 'idle'; refetch: () => void }
  | { status: 'loading'; refetch: () => void }
  | { status: 'error'; error: Error; refetch: () => void }
  | { status: 'success'; value: bigint; formatted: string; symbol: string; decimals: number; refetch: () => void }

export interface UseBalanceOptions {
  /** Address to fetch balance for */
  address: string
  /** Chain type */
  chainType: ChainTypeEnum
  /** Ethereum chain ID (default: 80002 Polygon Amoy) */
  chainId?: number
  /** Solana cluster (default: devnet) */
  cluster?: SolanaCluster
  /** Solana commitment level (default: confirmed) */
  commitment?: 'processed' | 'confirmed' | 'finalized'
  /** Enable/disable the query */
  enabled?: boolean
  /** Refetch interval in ms (default: 30000) */
  refetchInterval?: number
}

type BalanceResult = { value: bigint; formatted: string; symbol: string; decimals: number }

async function fetchEvmBalance(address: string, rpcUrl: string, chainId: number): Promise<BalanceResult> {
  const client = createPublicClient({ transport: http(rpcUrl) })
  const balance = await client.getBalance({ address: address as `0x${string}` })
  const { symbol, decimals } = getNativeCurrency(chainId)
  return { value: balance, formatted: formatEther(balance), symbol, decimals }
}

async function fetchSolanaBalance(
  addressStr: string,
  rpcUrl: string,
  commitment: 'processed' | 'confirmed' | 'finalized'
): Promise<BalanceResult> {
  const rpc = createSolanaRpc(rpcUrl)
  const { value: lamports } = await rpc.getBalance(address(addressStr), { commitment }).send()
  return {
    value: BigInt(lamports),
    formatted: lamportsToSol(BigInt(lamports)).toFixed(9),
    symbol: 'SOL',
    decimals: 9,
  }
}

/** Hook for fetching native token balance. */
export function useBalance(options: UseBalanceOptions): BalanceState {
  const {
    address,
    chainType,
    chainId = DEFAULT_TESTNET_CHAIN_ID,
    cluster = 'devnet',
    commitment = 'confirmed',
    enabled = true,
    refetchInterval = 30_000,
  } = options

  const { config } = useCoreContext()
  const rpcUrl =
    chainType === ChainTypeEnum.EVM
      ? (config.rpcUrls?.ethereum?.[chainId] ?? getDefaultEthereumRpcUrl(chainId))
      : (config.rpcUrls?.solana?.[cluster] ?? getDefaultSolanaRpcUrl(cluster))

  const isEnabled = enabled && !!address && address.length > 0

  const query = useQuery({
    queryKey: ['balance', chainType, address, chainId, cluster],
    queryFn: () =>
      chainType === ChainTypeEnum.EVM
        ? fetchEvmBalance(address, rpcUrl, chainId)
        : fetchSolanaBalance(address, rpcUrl, commitment),
    enabled: isEnabled,
    refetchInterval,
  })

  const refetch = query.refetch

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
    value: query.data?.value ?? BigInt(0),
    formatted: query.data?.formatted ?? '0',
    symbol: query.data?.symbol ?? '',
    decimals: query.data?.decimals ?? 18,
    refetch,
  }
}
