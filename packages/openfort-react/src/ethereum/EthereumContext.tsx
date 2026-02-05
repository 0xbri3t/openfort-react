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

import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from 'react'
import { logger } from '../utils/logger'

// =============================================================================
// Chain Types
// =============================================================================

/**
 * Common chain IDs for type hints (IDE autocomplete)
 * Users can still pass any number for custom chains.
 */
export type ChainId = 1 | 10 | 137 | 8453 | 42161 | 43114 | 56 | 250

/**
 * Result type for setChainId - forces caller to handle failure
 */
export type SetChainResult =
  | { success: true; chainId: number }
  | { success: false; error: 'CHAIN_NOT_CONFIGURED'; requested: number; available: number[] }

// =============================================================================
// Context Types
// =============================================================================

/**
 * Ethereum context value with resolved configuration
 */
export interface EthereumContextValue {
  /** Current active chain ID */
  chainId: number
  /**
   * Switch to a different chain.
   * @returns Result indicating success or failure with available chains
   * @example
   * const result = setChainId(137)
   * if (!result.success) {
   *   toast.error(`Chain not supported. Available: ${result.available.join(', ')}`)
   * }
   */
  setChainId: (chainId: ChainId | number) => SetChainResult
  /** RPC URL for the active chain */
  rpcUrl: string | undefined
  /** All configured RPC URLs */
  rpcUrls: Record<number, string>
  /** List of available chain IDs */
  availableChainIds: number[]
}

// =============================================================================
// Context
// =============================================================================

export const EthereumContext = createContext<EthereumContextValue | null>(null)

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
 *
 * @example Switching chains
 * ```tsx
 * function ChainSwitcher() {
 *   const { chainId, setChainId, availableChainIds } = useEthereumContext();
 *
 *   const switchToPolygon = () => {
 *     const result = setChainId(137);
 *     if (!result.success) {
 *       console.error(`Chain not configured. Available: ${result.available}`);
 *     }
 *   };
 *
 *   return <button onClick={switchToPolygon}>Switch to Polygon</button>;
 * }
 * ```
 */
export function EthereumContextProvider({
  chainId: initialChainId,
  rpcUrls = {},
  children,
}: EthereumContextProviderProps): ReactNode {
  const [chainId, setChainIdState] = useState(initialChainId)

  // Calculate available chain IDs from rpcUrls
  const availableChainIds = useMemo(() => Object.keys(rpcUrls).map(Number), [rpcUrls])

  const setChainId = useCallback(
    (newChainId: ChainId | number): SetChainResult => {
      // If rpcUrls is empty, allow any chain (user didn't configure restrictions)
      if (availableChainIds.length > 0 && !availableChainIds.includes(newChainId)) {
        if (process.env.NODE_ENV === 'development') {
          logger.warn(
            `[@openfort/react] setChainId(${newChainId}) failed: chain not configured.\n` +
              `Available chains: ${availableChainIds.join(', ')}\n` +
              `Add rpcUrls[${newChainId}] to your EthereumContextProvider config.`
          )
        }
        return {
          success: false,
          error: 'CHAIN_NOT_CONFIGURED',
          requested: newChainId,
          available: availableChainIds,
        }
      }

      setChainIdState(newChainId)
      return { success: true, chainId: newChainId }
    },
    [availableChainIds]
  )

  const value = useMemo<EthereumContextValue>(
    () => ({
      chainId,
      setChainId,
      rpcUrl: rpcUrls[chainId],
      rpcUrls,
      availableChainIds,
    }),
    [chainId, setChainId, rpcUrls, availableChainIds]
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
