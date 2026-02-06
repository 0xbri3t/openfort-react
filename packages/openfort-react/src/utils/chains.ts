export type ChainType = 'ethereum' | 'solana'

export type SolanaCluster = 'mainnet-beta' | 'testnet' | 'devnet'

export interface ChainAdapter<TWallet, TContext> {
  type: ChainType
  getWalletState: () => TWallet | null
  getContext: () => TContext | null
  formatAddress: (address: string) => string
}

const chainAdapters = new Map<ChainType, () => ChainAdapter<unknown, unknown>>()

export function registerChainAdapter(type: ChainType, factory: () => ChainAdapter<unknown, unknown>): void {
  chainAdapters.set(type, factory)
}

export function getChainAdapter(type: ChainType): ChainAdapter<unknown, unknown> | undefined {
  const factory = chainAdapters.get(type)
  return factory?.()
}

export function getAllChainAdapters(): ChainAdapter<unknown, unknown>[] {
  return Array.from(chainAdapters.values()).map((factory) => factory())
}

export function hasChainAdapter(type: ChainType): boolean {
  return chainAdapters.has(type)
}
