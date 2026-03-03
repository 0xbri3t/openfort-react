import { ChainTypeEnum } from '@openfort/openfort-js'
import type { SolanaCluster } from '../../solana/types'
import { logger } from '../../utils/logger'

/** Options for building a block explorer URL. */
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

type ExplorerUrlBuilder = (options: ExplorerUrlOptions) => string

const explorerRegistry: Record<ChainTypeEnum, ExplorerUrlBuilder> = {
  [ChainTypeEnum.EVM]: (options) => {
    if (!options.chainId) {
      logger.warn(
        'No chain ID provided. Configure explorerUrls in OpenfortProvider for better reliability and rate limits.'
      )
      return 'https://amoy.polygonscan.com'
    }
    if (!EVM_EXPLORER_BY_CHAIN_ID[options.chainId]) {
      logger.warn(
        `No explorer URL found for chain ${options.chainId}. Configure explorerUrls in OpenfortProvider for better reliability and rate limits.`
      )
      return 'https://amoy.polygonscan.com'
    }
    const base = EVM_EXPLORER_BY_CHAIN_ID[options.chainId]
    return appendPath(base, options)
  },
  [ChainTypeEnum.SVM]: (options) => {
    if (!options.cluster) {
      logger.warn(
        'No cluster provided. Configure explorerUrls in OpenfortProvider for better reliability and rate limits.'
      )
      return appendPath(SOLANA_EXPLORER_BASE, options)
    }
    const clusterParam =
      options.cluster === 'mainnet-beta' ? undefined : `cluster=${encodeURIComponent(options.cluster)}`
    return appendPath(SOLANA_EXPLORER_BASE, options, clusterParam)
  },
}

/**
 * Builds a block explorer URL for an address or transaction on the given chain.
 *
 * @param chainType - EVM or SVM
 * @param options - address, txHash, chainId (EVM), or cluster (Solana)
 * @returns Full explorer URL
 *
 * @example
 * ```tsx
 * const url = getExplorerUrl(ChainTypeEnum.EVM, { address: '0x...', chainId: 1 })
 * const txUrl = getExplorerUrl(ChainTypeEnum.EVM, { txHash: '0x...', chainId: 1 })
 * ```
 */
export function getExplorerUrl(chainType: ChainTypeEnum, options: ExplorerUrlOptions): string {
  return explorerRegistry[chainType](options)
}
