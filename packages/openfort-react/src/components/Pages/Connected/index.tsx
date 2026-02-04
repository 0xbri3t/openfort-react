/**
 * Connected Page Router
 *
 * Routes to the appropriate connected page based on available chains.
 * Uses useAvailableChains to determine which view to render.
 *
 * @see RFC-0001 Section 9
 */

import type React from 'react'
import { useAvailableChains } from '../../../shared/hooks/useAvailableChains'
import EthereumConnected from './EthereumConnected'
import MultiChainConnected from './MultiChainConnected'
import SolanaConnected from './SolanaConnected'

/**
 * Connected page router component
 *
 * Renders the appropriate connected page based on the available chains:
 * - ethereum-only: EthereumConnected
 * - solana-only: SolanaConnected
 * - multi-chain: MultiChainConnected (with tabs)
 */
const Connected: React.FC = () => {
  const { mode } = useAvailableChains()

  switch (mode) {
    case 'ethereum-only':
      return <EthereumConnected />
    case 'solana-only':
      return <SolanaConnected />
    case 'multi-chain':
      return <MultiChainConnected />
    default:
      // Fallback to Ethereum for backwards compatibility
      return <EthereumConnected />
  }
}

export default Connected
