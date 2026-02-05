/**
 * Chain Registry
 *
 * Extensible chain type definitions and adapter registry pattern.
 * Designed for future chain additions (Bitcoin, etc.)
 *
 * @see Phase E1.0
 */

// =============================================================================
// Chain Type Definitions
// =============================================================================

/**
 * Supported chain types - extensible for future chains
 */
export type ChainType = 'ethereum' | 'solana'

/**
 * Solana cluster types
 */
export type SolanaCluster = 'mainnet-beta' | 'testnet' | 'devnet'

// =============================================================================
// Chain Adapter Interface
// =============================================================================

/**
 * Chain adapter interface - each chain implements this
 *
 * @typeParam TWallet - Wallet state type for this chain
 * @typeParam TContext - Context value type for this chain
 */
export interface ChainAdapter<TWallet, TContext> {
  type: ChainType
  getWalletState: () => TWallet | null
  getContext: () => TContext | null
  formatAddress: (address: string) => string
}

// =============================================================================
// Chain Adapter Registry
// =============================================================================

const chainAdapters = new Map<ChainType, () => ChainAdapter<unknown, unknown>>()

/**
 * Register a chain adapter factory
 */
export function registerChainAdapter(type: ChainType, factory: () => ChainAdapter<unknown, unknown>): void {
  chainAdapters.set(type, factory)
}

/**
 * Get a chain adapter by type
 */
export function getChainAdapter(type: ChainType): ChainAdapter<unknown, unknown> | undefined {
  const factory = chainAdapters.get(type)
  return factory?.()
}

/**
 * Get all registered chain adapters
 */
export function getAllChainAdapters(): ChainAdapter<unknown, unknown>[] {
  return Array.from(chainAdapters.values()).map((factory) => factory())
}

/**
 * Check if a chain type is registered
 */
export function hasChainAdapter(type: ChainType): boolean {
  return chainAdapters.has(type)
}
