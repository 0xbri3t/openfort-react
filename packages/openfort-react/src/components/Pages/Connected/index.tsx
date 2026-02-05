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
import SolanaConnected from './SolanaConnected'

export const Connected: React.FC = () => {
  const { mode } = useAvailableChains()

  switch (mode) {
    case 'ethereum-only':
      return <EthereumConnected />
    case 'solana-only':
      return <SolanaConnected />
    default:
      return null
  }
}
