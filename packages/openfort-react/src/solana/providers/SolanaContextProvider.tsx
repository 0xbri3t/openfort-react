/**
 * Solana Context Provider
 *
 * Provides Solana configuration (cluster, RPC URL, commitment) to descendant components.
 *
 * @see RFC-0001 Section 1.8
 */

import { createContext, type ReactNode, useContext, useMemo } from 'react'
import type { SolanaCluster, SolanaCommitment, SolanaConfig } from '../types'

// =============================================================================
// Context Types
// =============================================================================

/**
 * Solana context value with resolved configuration
 */
export interface SolanaContextValue {
  /** Active Solana cluster */
  cluster: SolanaCluster
  /** RPC URL (resolved from config or default) */
  rpcUrl: string
  /** Transaction commitment level */
  commitment: SolanaCommitment
}

// =============================================================================
// Default RPC URLs (Registry Pattern)
// =============================================================================

const DEFAULT_RPC_URLS: Record<SolanaCluster, string> = {
  'mainnet-beta': 'https://api.mainnet-beta.solana.com',
  devnet: 'https://api.devnet.solana.com',
  testnet: 'https://api.testnet.solana.com',
}

/**
 * Get the default public RPC URL for a Solana cluster
 */
function getDefaultRpcUrl(cluster: SolanaCluster): string {
  return DEFAULT_RPC_URLS[cluster]
}

// =============================================================================
// Context
// =============================================================================

export const SolanaContext = createContext<SolanaContextValue | null>(null)

// =============================================================================
// Provider Props
// =============================================================================

export interface SolanaContextProviderProps {
  /** Solana configuration from OpenfortWalletConfig */
  config: SolanaConfig
  /** Child components */
  children: ReactNode
}

// =============================================================================
// Provider Component
// =============================================================================

/**
 * Provides Solana configuration context to descendant components.
 *
 * This provider is automatically rendered by OpenfortProvider when
 * `walletConfig.solana` is configured.
 *
 * @example
 * ```tsx
 * // Usually you don't use this directly, configure via OpenfortProvider:
 * <OpenfortProvider
 *   publishableKey="pk_..."
 *   walletConfig={{
 *     shieldPublishableKey: 'shield_pk_...',
 *     solana: {
 *       cluster: 'mainnet-beta',
 *       commitment: 'confirmed'
 *     }
 *   }}
 * >
 *   <App />
 * </OpenfortProvider>
 * ```
 */
export function SolanaContextProvider({ config, children }: SolanaContextProviderProps) {
  const value = useMemo<SolanaContextValue>(
    () => ({
      cluster: config.cluster,
      rpcUrl: config.rpcUrl ?? getDefaultRpcUrl(config.cluster),
      commitment: config.commitment ?? 'confirmed',
    }),
    [config.cluster, config.rpcUrl, config.commitment]
  )

  return <SolanaContext.Provider value={value}>{children}</SolanaContext.Provider>
}

// =============================================================================
// Hook
// =============================================================================

/**
 * Access the Solana context configuration.
 *
 * @throws Error if called outside of a SolanaContextProvider
 * (i.e., when `walletConfig.solana` is not configured in OpenfortProvider)
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { cluster, rpcUrl, commitment } = useSolanaContext();
 *   // Use Solana configuration...
 * }
 * ```
 */
export function useSolanaContext(): SolanaContextValue {
  const context = useContext(SolanaContext)
  if (!context) {
    throw new Error(
      'useSolanaContext must be used within a SolanaContextProvider. ' +
        'Make sure walletConfig.solana is configured in OpenfortProvider.'
    )
  }
  return context
}
