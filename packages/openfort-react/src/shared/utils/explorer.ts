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
  11155111: 'https://sepolia.etherscan.io',
  137: 'https://polygonscan.com',
  80002: 'https://amoy.polygonscan.com',
}

function appendPath(base: string, options: { address?: string; txHash?: string }): string {
  if (options.address) return `${base}/address/${options.address}`
  if (options.txHash) return `${base}/tx/${options.txHash}`
  return base
}

type ExplorerUrlBuilder = (options: ExplorerUrlOptions) => string

const explorerRegistry: Record<ChainTypeEnum, ExplorerUrlBuilder> = {
  [ChainTypeEnum.EVM]: (options) => {
    const chainId = options.chainId ?? 1
    const base = EVM_EXPLORER_BY_CHAIN_ID[chainId] ?? 'https://etherscan.io'
    return appendPath(base, options)
  },
  [ChainTypeEnum.SVM]: (options) => {
    const cluster = options.cluster ?? 'mainnet-beta'
    const base = cluster === 'mainnet-beta' ? SOLANA_EXPLORER_BASE : `${SOLANA_EXPLORER_BASE}/?cluster=${cluster}`
    return appendPath(base, options)
  },
}

export function getExplorerUrl(chainType: ChainTypeEnum, options: ExplorerUrlOptions): string {
  return explorerRegistry[chainType](options)
}
