import { ChainTypeEnum } from '@openfort/openfort-js'
import type { SolanaCluster } from '../../solana/types'

export type ExplorerUrlOptions = {
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

function appendPath(base: string, options: { address?: string; txHash?: string }): string {
  if (options.address) return `${base}/address/${options.address}`
  if (options.txHash) return `${base}/tx/${options.txHash}`
  return base
}

type ExplorerUrlBuilder = (options: ExplorerUrlOptions) => string

const explorerRegistry: Record<ChainTypeEnum, ExplorerUrlBuilder> = {
  [ChainTypeEnum.EVM]: (options) => {
    const chainId = options.chainId ?? 80002
    const base = EVM_EXPLORER_BY_CHAIN_ID[chainId] ?? 'https://amoy.polygonscan.com'
    return appendPath(base, options)
  },
  [ChainTypeEnum.SVM]: (options) => {
    const cluster = options.cluster ?? 'devnet'
    const base = cluster === 'mainnet-beta' ? SOLANA_EXPLORER_BASE : `${SOLANA_EXPLORER_BASE}/?cluster=${cluster}`
    return appendPath(base, options)
  },
}

export function getExplorerUrl(chainType: ChainTypeEnum, options: ExplorerUrlOptions): string {
  return explorerRegistry[chainType](options)
}
