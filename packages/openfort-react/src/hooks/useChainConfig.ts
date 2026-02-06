/**
 * useChainConfig Hook
 *
 * Get chain configuration and available chains.
 * Replaces wagmi's useChains for wagmi-free architecture.
 */

import { useContext, useMemo } from 'react'

import { useCoreContext } from '../core/CoreContext'
import { EthereumContext } from '../ethereum/EthereumContext'
import { SolanaContext } from '../solana/providers/SolanaContextProvider'
import type { ChainType, SolanaCluster } from '../utils/chains'
import { getChainName, getNativeCurrency, type NativeCurrency } from '../utils/rpc'

/**
 * Chain info for Ethereum chains
 */
export interface ChainInfo {
  id: number
  name: string
  nativeCurrency: NativeCurrency
  rpcUrl?: string
}

/**
 * Chain configuration
 */
export interface ChainConfig {
  /** Configured Ethereum chains */
  ethereum: ChainInfo[]
  /** Configured Solana clusters */
  solana: SolanaCluster[]
  /** List of available chain types */
  availableChainTypes: ChainType[]
  /** Get chain info by chain ID */
  getChain: (chainId: number) => ChainInfo | undefined
  /** Current Ethereum chain (if configured) */
  currentEthereumChain: ChainInfo | null
  /** Current Solana cluster (if configured) */
  currentSolanaCluster: SolanaCluster | null
}

/**
 * Hook for getting chain configuration.
 *
 * Provides information about configured chains without wagmi dependency.
 *
 * @example Basic usage
 * ```tsx
 * function ChainSelector() {
 *   const config = useChainConfig();
 *
 *   return (
 *     <div>
 *       <h3>Available chains:</h3>
 *       {config.ethereum.map(chain => (
 *         <div key={chain.id}>
 *           {chain.name} ({chain.nativeCurrency.symbol})
 *         </div>
 *       ))}
 *       {config.solana.map(cluster => (
 *         <div key={cluster}>Solana {cluster}</div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useChainConfig(): ChainConfig {
  const ethContext = useContext(EthereumContext)
  const solContext = useContext(SolanaContext)
  const { config } = useCoreContext()

  const ethereumChains = useMemo(() => {
    const rpcUrls = config.rpcUrls?.ethereum ?? {}

    // Build chains from RPC URLs config
    const chains = Object.entries(rpcUrls).map(([chainIdStr, rpcUrl]) => {
      const id = Number(chainIdStr)
      return {
        id,
        name: getChainName(id),
        nativeCurrency: getNativeCurrency(id),
        rpcUrl,
      }
    })

    // Always include current chain if configured and no chains from rpcUrls
    if (ethContext && chains.length === 0) {
      return [
        {
          id: ethContext.chainId,
          name: getChainName(ethContext.chainId),
          nativeCurrency: getNativeCurrency(ethContext.chainId),
          rpcUrl: ethContext.rpcUrl,
        },
      ]
    }

    return chains
  }, [config.rpcUrls, ethContext])

  const solanaClusters = useMemo<SolanaCluster[]>(() => (solContext ? [solContext.cluster] : []), [solContext])

  const availableChainTypes = useMemo(() => {
    const chainContexts: Record<ChainType, unknown | null> = {
      ethereum: ethContext,
      solana: solContext,
    }
    return (Object.entries(chainContexts) as [ChainType, unknown | null][])
      .filter(([_, ctx]) => ctx !== null)
      .map(([type]) => type)
  }, [ethContext, solContext])

  const getChain = useMemo(() => {
    return (chainId: number) => ethereumChains.find((c) => c.id === chainId)
  }, [ethereumChains])

  const currentEthereumChain = useMemo<ChainInfo | null>(() => {
    if (!ethContext) return null
    return {
      id: ethContext.chainId,
      name: getChainName(ethContext.chainId),
      nativeCurrency: getNativeCurrency(ethContext.chainId),
      rpcUrl: ethContext.rpcUrl,
    }
  }, [ethContext])

  const currentSolanaCluster = useMemo<SolanaCluster | null>(() => {
    return solContext?.cluster ?? null
  }, [solContext])

  return {
    ethereum: ethereumChains,
    solana: solanaClusters,
    availableChainTypes,
    getChain,
    currentEthereumChain,
    currentSolanaCluster,
  }
}
