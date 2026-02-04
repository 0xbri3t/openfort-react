/**
 * Ethereum Context Provider (OPTIONAL)
 *
 * Provides default Ethereum configuration to descendant components.
 * NOT required - useEthereumWallet defaults to chainId: 1 without it.
 *
 * Use this when:
 * - Your app uses a non-mainnet chain by default
 * - You want to avoid passing chainId to every hook call
 * - You want to configure RPC URLs via context
 */

import { createContext, type ReactNode, useContext, useMemo } from 'react'

// =============================================================================
// Context Types
// =============================================================================

/**
 * Ethereum context value with resolved configuration
 */
export interface EthereumContextValue {
  /** Default chain ID for hooks */
  chainId: number
  /** RPC URL for the active chain */
  rpcUrl: string | undefined
  /** All configured RPC URLs */
  rpcUrls: Record<number, string>
}

// =============================================================================
// Context
// =============================================================================

const EthereumContext = createContext<EthereumContextValue | null>(null)

// =============================================================================
// Provider Props
// =============================================================================

export interface EthereumContextProviderProps {
  /** Default chain ID for descendant hooks */
  chainId: number
  /** RPC URLs by chain ID (optional) */
  rpcUrls?: Record<number, string>
  /** Child components */
  children: ReactNode
}

// =============================================================================
// Provider Component
// =============================================================================

/**
 * Provides default Ethereum configuration to descendant components.
 *
 * OPTIONAL - useEthereumWallet works without it (defaults to mainnet).
 *
 * @example Polygon as default chain
 * ```tsx
 * <EthereumContextProvider chainId={137}>
 *   <App /> {// useEthereumWallet() defaults to Polygon }
 * </EthereumContextProvider>
 * ```
 *
 * @example With custom RPC URLs
 * ```tsx
 * <EthereumContextProvider
 *   chainId={1}
 *   rpcUrls={{
 *     1: 'https://eth-mainnet.g.alchemy.com/v2/...',
 *     137: 'https://polygon-mainnet.g.alchemy.com/v2/...',
 *   }}
 * >
 *   <App />
 * </EthereumContextProvider>
 * ```
 */
export function EthereumContextProvider({ chainId, rpcUrls = {}, children }: EthereumContextProviderProps): ReactNode {
  const value = useMemo<EthereumContextValue>(
    () => ({
      chainId,
      rpcUrl: rpcUrls[chainId],
      rpcUrls,
    }),
    [chainId, rpcUrls]
  )

  return <EthereumContext.Provider value={value}>{children}</EthereumContext.Provider>
}

// =============================================================================
// Hooks
// =============================================================================

/**
 * Access Ethereum context configuration.
 *
 * @throws Error if called outside of EthereumContextProvider
 *
 * NOTE: Most code should use useEthereumContextSafe() instead,
 * since EthereumContext is optional.
 */
export function useEthereumContext(): EthereumContextValue {
  const context = useContext(EthereumContext)
  if (!context) {
    throw new Error(
      'useEthereumContext must be used within EthereumContextProvider. ' +
        "If you don't need context, use useEthereumWallet({ chainId }) directly."
    )
  }
  return context
}

/**
 * Safely check if Ethereum context is available.
 *
 * Returns null if not in EthereumContextProvider (which is fine,
 * since the context is optional).
 */
export function useEthereumContextSafe(): EthereumContextValue | null {
  return useContext(EthereumContext)
}
