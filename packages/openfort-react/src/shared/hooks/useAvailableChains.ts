/**
 * Hook for detecting available chains in the current configuration.
 *
 * Used internally by UI components to determine which chain-specific
 * components to render (e.g., Connected page, CreateWallet flow).
 *
 * @see RFC-0001 Section 1.6, Plan Section 3
 */

import { useContext } from 'react'
import { WagmiContext } from 'wagmi'
import { Openfortcontext } from '../../components/Openfort/context'
import type { AvailableChainsResult, ChainMode } from '../types'

/**
 * Detect which chains are available based on provider configuration.
 *
 * Checks for:
 * - Ethereum: WagmiContext presence
 * - Solana: walletConfig.solana configuration
 *
 * @returns Object with hasEthereum, hasSolana, and mode
 *
 * @example
 * ```tsx
 * function ConnectedPage() {
 *   const { hasEthereum, hasSolana, mode } = useAvailableChains();
 *
 *   if (mode === 'multi-chain') {
 *     return <MultiChainConnected />;
 *   } else if (mode === 'solana-only') {
 *     return <SolanaConnected />;
 *   } else {
 *     return <EthereumConnected />;
 *   }
 * }
 * ```
 */
export function useAvailableChains(): AvailableChainsResult {
  // Check for Wagmi context (Ethereum support)
  const wagmiContext = useContext(WagmiContext)
  const hasEthereum = !!wagmiContext

  // Check for Solana configuration
  const openfortContext = useContext(Openfortcontext)
  const hasSolana = !!openfortContext?.walletConfig?.solana

  // Determine mode
  const mode: ChainMode = hasEthereum && hasSolana ? 'multi-chain' : hasSolana ? 'solana-only' : 'ethereum-only'

  return {
    hasEthereum,
    hasSolana,
    mode,
  }
}
