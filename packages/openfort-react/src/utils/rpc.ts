/**
 * RPC Utilities
 *
 * Default RPC URLs and chain metadata.
 */

import type { Chain } from 'viem'
import { defineChain } from 'viem'
import type { SolanaCluster } from '../solana/types'

/**
 * Default Ethereum RPC URLs by chain ID — testnets only.
 * Production apps must provide their own RPCs via walletConfig.ethereum.rpcUrls.
 */
const DEFAULT_ETHEREUM_RPC_URLS: Record<number, string> = {
  80002: 'https://rpc-amoy.polygon.technology',
  84532: 'https://sepolia.base.org',
  13337: 'https://build.onbeam.com/rpc/testnet',
  11155111: 'https://rpc.sepolia.org',
  11155420: 'https://sepolia.optimism.io',
  421614: 'https://sepolia-rollup.arbitrum.io/rpc',
}

/**
 * Default Solana RPC URLs by cluster — testnets only.
 * Production apps must provide their own RPCs via walletConfig.solana.
 */
const DEFAULT_SOLANA_RPC_URLS: Partial<Record<Exclude<SolanaCluster, 'custom'>, string>> = {
  devnet: 'https://api.devnet.solana.com',
  testnet: 'https://api.testnet.solana.com',
}

/**
 * Get default Ethereum RPC URL for a chain ID.
 * Returns undefined when chain is not in the testnet map.
 */
export function getDefaultEthereumRpcUrl(chainId: number): string | undefined {
  return DEFAULT_ETHEREUM_RPC_URLS[chainId]
}

/**
 * Get default Solana RPC URL for a cluster.
 * Defaults to devnet for unknown or 'custom' clusters.
 */
export function getDefaultSolanaRpcUrl(cluster: SolanaCluster): string | undefined {
  if (cluster === 'custom') return DEFAULT_SOLANA_RPC_URLS.devnet
  return DEFAULT_SOLANA_RPC_URLS[cluster]
}

/**
 * Chain names by chain ID
 */
const CHAIN_NAMES: Record<number, string> = {
  80002: 'Polygon Amoy',
  84532: 'Base Sepolia',
  13337: 'Beam Testnet',
  11155111: 'Sepolia',
  11155420: 'Optimism Sepolia',
  421614: 'Arbitrum Sepolia',
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
const NATIVE_CURRENCIES: Record<number, NativeCurrency> = {
  80002: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
  84532: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  13337: { name: 'BEAM', symbol: 'BEAM', decimals: 18 },
  11155111: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  11155420: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  421614: { name: 'Ether', symbol: 'ETH', decimals: 18 },
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
const BLOCK_EXPLORERS: Record<number, string> = {
  80002: 'https://amoy.polygonscan.com',
  84532: 'https://sepolia.basescan.org',
  13337: 'https://subnets-test.avax.network/beam',
  11155111: 'https://sepolia.etherscan.io',
  11155420: 'https://sepolia-optimism.etherscan.io',
  421614: 'https://sepolia.arbiscan.io',
}

/**
 * Get block explorer URL for a chain
 */
function getBlockExplorerUrl(chainId: number): string | undefined {
  return BLOCK_EXPLORERS[chainId]
}

/**
 * Build a viem Chain from chainId and optional rpcUrls (e.g. from walletConfig.ethereum.rpcUrls).
 * Used when no bridge is present (embedded strategy) so useChains() and viem clients have a Chain.
 */
export function buildChainFromConfig(chainId: number, rpcUrls?: Record<number, string>): Chain {
  const rpcUrl = rpcUrls?.[chainId] ?? getDefaultEthereumRpcUrl(chainId)
  if (!rpcUrl) {
    throw new Error(`No RPC URL configured for chain ${chainId}. Provide walletConfig.ethereum.rpcUrls[${chainId}].`)
  }
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
