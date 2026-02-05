/**
 * Hook for detecting available chains in the current configuration.
 *
 * Used internally by UI components to determine which chain-specific
 * components to render (e.g., Connected page, CreateWallet flow).
 *
 * @see RFC-0001 Section 1.6, Plan Section 3
 */

import { useContext } from 'react'
import { EthereumContext } from '../../ethereum/EthereumContext'
import { SolanaContext } from '../../solana/providers/SolanaContextProvider'
import type { AvailableChainsResult, ChainMode } from '../types'

/**
 * Detect which chains are available based on provider configuration.
 *
 * Checks for:
 * - Ethereum: EthereumContext presence
 * - Solana: SolanaContext presence
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
  // Check for Ethereum context
  const ethereumContext = useContext(EthereumContext)
  const hasEthereum = !!ethereumContext

  // Check for Solana context
  const solanaContext = useContext(SolanaContext)
  const hasSolana = !!solanaContext

  // Determine mode
  const mode: ChainMode = hasEthereum && hasSolana ? 'multi-chain' : hasSolana ? 'solana-only' : 'ethereum-only'

  // Build availableChains with proper type narrowing
  const availableChains: readonly ('ethereum' | 'solana')[] = [
    ...(hasEthereum ? (['ethereum'] as const) : []),
    ...(hasSolana ? (['solana'] as const) : []),
  ]

  return {
    hasEthereum,
    hasSolana,
    availableChains,
    mode,
  }
}
