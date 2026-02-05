/**
 * useActiveChain Hook
 *
 * Returns the currently active chain based on connected wallet.
 * Uses registry pattern for chain type lookups.
 *
 * @see Phase E1.2
 */

import { useContext } from 'react'

import { EthereumContext } from '../ethereum/EthereumContext'
import { SolanaContext } from '../solana/providers/SolanaContextProvider'
import type { ChainType, SolanaCluster } from '../utils/chains'
import { getChainName } from '../utils/rpc'
import { useConnectedWallet } from './useConnectedWallet'

// =============================================================================
// Types
// =============================================================================

/**
 * Active chain state - discriminated union
 */
export type ActiveChainState =
  | { type: 'none' }
  | { type: 'ethereum'; chainId: number; name: string; rpcUrl?: string }
  | { type: 'solana'; cluster: SolanaCluster; rpcUrl: string }

export interface UseActiveChainOptions {
  /** Preferred chain when multiple wallets are connected */
  preferredChain?: ChainType
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Hook for getting the currently active chain.
 *
 * Returns chain information based on the connected wallet.
 * Uses lookup map instead of if/else for scalability.
 *
 * @example Basic usage
 * ```tsx
 * function ChainDisplay() {
 *   const chain = useActiveChain();
 *
 *   switch (chain.type) {
 *     case 'none':
 *       return <p>No chain active</p>;
 *     case 'ethereum':
 *       return <p>Connected to {chain.name} (Chain ID: {chain.chainId})</p>;
 *     case 'solana':
 *       return <p>Connected to Solana {chain.cluster}</p>;
 *   }
 * }
 * ```
 *
 * @example With preferred chain
 * ```tsx
 * const chain = useActiveChain({ preferredChain: 'solana' });
 * ```
 */
export function useActiveChain(options?: UseActiveChainOptions): ActiveChainState {
  const wallet = useConnectedWallet({ preferredChain: options?.preferredChain })
  const ethContext = useContext(EthereumContext)
  const solContext = useContext(SolanaContext)

  // Early return if not connected
  if (wallet.status !== 'connected') {
    return { type: 'none' }
  }

  // Use lookup map instead of if/else - scalable
  const chainStateMap: Record<ChainType, () => ActiveChainState> = {
    ethereum: () =>
      ethContext
        ? {
            type: 'ethereum',
            chainId: ethContext.chainId,
            name: getChainName(ethContext.chainId),
            rpcUrl: ethContext.rpcUrl,
          }
        : { type: 'none' },

    solana: () =>
      solContext
        ? {
            type: 'solana',
            cluster: solContext.cluster,
            rpcUrl: solContext.rpcUrl,
          }
        : { type: 'none' },
  }

  return chainStateMap[wallet.chainType]?.() ?? { type: 'none' }
}
