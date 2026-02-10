/**
 * RPC Utilities
 *
 * Default RPC URLs and chain metadata.
 */

import type { Chain } from 'viem'
import { defineChain } from 'viem'
import type { SolanaCluster } from '../solana/types'

/**
 * Default Ethereum RPC URLs by chain ID
 * Uses public RPC endpoints - users should provide their own for production
 */
export const DEFAULT_ETHEREUM_RPC_URLS: Record<number, string> = {
  1: 'https://eth.llamarpc.com',
  10: 'https://mainnet.optimism.io',
  137: 'https://polygon-rpc.com',
  8453: 'https://mainnet.base.org',
  42161: 'https://arb1.arbitrum.io/rpc',
  43114: 'https://api.avax.network/ext/bc/C/rpc',
  56: 'https://bsc-dataseed.binance.org',
  250: 'https://rpc.ftm.tools',
  11155111: 'https://rpc.sepolia.org',
}

/**
 * Default Solana RPC URLs by cluster (custom uses devnet as fallback)
 */
export const DEFAULT_SOLANA_RPC_URLS: Record<Exclude<SolanaCluster, 'custom'>, string> = {
  'mainnet-beta': 'https://api.mainnet-beta.solana.com',
  devnet: 'https://api.devnet.solana.com',
  testnet: 'https://api.testnet.solana.com',
}

/**
 * Get default Ethereum RPC URL for a chain ID
 * Falls back to mainnet if chain not configured
 */
export function getDefaultEthereumRpcUrl(chainId: number): string {
  return DEFAULT_ETHEREUM_RPC_URLS[chainId] ?? DEFAULT_ETHEREUM_RPC_URLS[1]
}

/**
 * Get default Solana RPC URL for a cluster
 * Falls back to mainnet-beta if cluster not found
 */
export function getDefaultSolanaRpcUrl(cluster: SolanaCluster): string {
  if (cluster === 'custom') return DEFAULT_SOLANA_RPC_URLS.devnet
  return DEFAULT_SOLANA_RPC_URLS[cluster] ?? DEFAULT_SOLANA_RPC_URLS['mainnet-beta']
}

/**
 * Chain names by chain ID
 */
export const CHAIN_NAMES: Record<number, string> = {
  1: 'Ethereum',
  10: 'Optimism',
  137: 'Polygon',
  8453: 'Base',
  42161: 'Arbitrum One',
  43114: 'Avalanche',
  56: 'BNB Smart Chain',
  250: 'Fantom',
  11155111: 'Sepolia',
}

/**
 * Native currency configuration
 */
export interface NativeCurrency {
  name: string
  symbol: string
  decimals: number
}

/**
 * Native currencies by chain ID
 */
export const NATIVE_CURRENCIES: Record<number, NativeCurrency> = {
  1: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  10: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  137: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
  8453: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  42161: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  43114: { name: 'Avalanche', symbol: 'AVAX', decimals: 18 },
  56: { name: 'BNB', symbol: 'BNB', decimals: 18 },
  250: { name: 'Fantom', symbol: 'FTM', decimals: 18 },
  11155111: { name: 'Ether', symbol: 'ETH', decimals: 18 },
}

/**
 * Default native currency (ETH on mainnet)
 */
const DEFAULT_NATIVE_CURRENCY: NativeCurrency = { name: 'Ether', symbol: 'ETH', decimals: 18 }

/**
 * Get chain name by chain ID
 */
export function getChainName(chainId: number): string {
  return CHAIN_NAMES[chainId] ?? `Chain ${chainId}`
}

/**
 * Get native currency configuration for a chain
 */
export function getNativeCurrency(chainId: number): NativeCurrency {
  return NATIVE_CURRENCIES[chainId] ?? DEFAULT_NATIVE_CURRENCY
}

/**
 * Block explorer URLs by chain ID
 */
export const BLOCK_EXPLORERS: Record<number, string> = {
  1: 'https://etherscan.io',
  10: 'https://optimistic.etherscan.io',
  137: 'https://polygonscan.com',
  8453: 'https://basescan.org',
  42161: 'https://arbiscan.io',
  43114: 'https://snowtrace.io',
  56: 'https://bscscan.com',
  250: 'https://ftmscan.com',
  11155111: 'https://sepolia.etherscan.io',
}

/**
 * Get block explorer URL for a chain
 */
export function getBlockExplorerUrl(chainId: number): string | undefined {
  return BLOCK_EXPLORERS[chainId]
}

/**
 * Get transaction URL on block explorer
 */
export function getTransactionUrl(chainId: number, txHash: string): string | undefined {
  const explorer = BLOCK_EXPLORERS[chainId]
  return explorer ? `${explorer}/tx/${txHash}` : undefined
}

/**
 * Get address URL on block explorer
 */
export function getAddressUrl(chainId: number, address: string): string | undefined {
  const explorer = BLOCK_EXPLORERS[chainId]
  return explorer ? `${explorer}/address/${address}` : undefined
}

/**
 * Build a viem Chain from chainId and optional rpcUrls (e.g. from walletConfig.ethereum.rpcUrls).
 * Used when no bridge is present (embedded strategy) so useChains() and viem clients have a Chain.
 */
export function buildChainFromConfig(chainId: number, rpcUrls?: Record<number, string>): Chain {
  const rpcUrl = rpcUrls?.[chainId] ?? getDefaultEthereumRpcUrl(chainId)
  const native = getNativeCurrency(chainId)
  const explorerUrl = getBlockExplorerUrl(chainId)
  return defineChain({
    id: chainId,
    name: getChainName(chainId),
    nativeCurrency: { decimals: native.decimals, name: native.name, symbol: native.symbol },
    rpcUrls: { default: { http: [rpcUrl] } },
    ...(explorerUrl && { blockExplorers: { default: { name: 'Explorer', url: explorerUrl } } }),
  })
}
