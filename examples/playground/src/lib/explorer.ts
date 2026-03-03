import { ChainTypeEnum } from '@openfort/react'
import type { SolanaCluster } from '@openfort/react/solana'

type ExplorerUrlOptions = {
  address?: string
  txHash?: string
  chainId?: number
  cluster?: SolanaCluster
}

const SOLANA_EXPLORER_BASE = 'https://explorer.solana.com'

const EVM_EXPLORER_BY_CHAIN_ID: Record<number, string> = {
  1: 'https://etherscan.io',
  10: 'https://optimistic.etherscan.io',
  137: 'https://polygonscan.com',
  8453: 'https://basescan.org',
  42161: 'https://arbiscan.io',
  56: 'https://bscscan.com',
  43114: 'https://snowtrace.io',
  80002: 'https://amoy.polygonscan.com',
  84532: 'https://sepolia.basescan.org',
  13337: 'https://subnets-test.avax.network/beam',
  11155111: 'https://sepolia.etherscan.io',
  11155420: 'https://sepolia-optimism.etherscan.io',
  421614: 'https://sepolia.arbiscan.io',
}

function appendPath(base: string, options: { address?: string; txHash?: string }, queryParams?: string): string {
  let path = base
  if (options.address) path = `${base}/address/${options.address}`
  else if (options.txHash) path = `${base}/tx/${options.txHash}`
  return queryParams ? `${path}?${queryParams}` : path
}

export function getExplorerUrl(chainType: ChainTypeEnum, options: ExplorerUrlOptions): string {
  if (chainType === ChainTypeEnum.EVM) {
    const chainId = options.chainId ?? 13337
    const base = EVM_EXPLORER_BY_CHAIN_ID[chainId] ?? 'https://amoy.polygonscan.com'
    return appendPath(base, options)
  }

  const cluster = options.cluster ?? 'devnet'
  const clusterParam = cluster === 'mainnet-beta' ? undefined : `cluster=${encodeURIComponent(cluster)}`
  return appendPath(SOLANA_EXPLORER_BASE, options, clusterParam)
}
