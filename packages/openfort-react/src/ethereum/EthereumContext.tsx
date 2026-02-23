/**
 * Ethereum Context Provider (OPTIONAL)
 *
 * Provides default Ethereum configuration to descendant components.
 * NOT required - useEthereumEmbeddedWallet defaults to chainId: 1 without it.
 *
 * Use this when:
 * - Your app uses a non-mainnet chain by default
 * - You want to avoid passing chainId to every hook call
 * - You want to configure RPC URLs via context
 */

import { createContext } from 'react'

/**
 * Common chain IDs for type hints (IDE autocomplete)
 * Users can still pass any number for custom chains.
 */
type ChainId = 1 | 10 | 137 | 8453 | 42161 | 43114 | 56 | 250

/**
 * Result type for setChainId - forces caller to handle failure
 */
type SetChainResult =
  | { success: true; chainId: number }
  | { success: false; error: 'CHAIN_NOT_CONFIGURED'; requested: number; available: number[] }

/**
 * Ethereum context value with resolved configuration
 */
interface EthereumContextValue {
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

export const EthereumContext = createContext<EthereumContextValue | null>(null)

/**
 * Provides default Ethereum configuration to descendant components.
 *
 * OPTIONAL - useEthereumEmbeddedWallet works without it (defaults to mainnet).
 *
 * @example Polygon as default chain
 * ```tsx
 * <EthereumContextProvider chainId={137}>
 *   <App />
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
