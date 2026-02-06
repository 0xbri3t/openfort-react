import { useContext } from 'react'

import { EthereumContext } from '../ethereum/EthereumContext'
import { SolanaContext } from '../solana/providers/SolanaContextProvider'
import type { ChainType, SolanaCluster } from '../utils/chains'
import { getChainName } from '../utils/rpc'
import { useConnectedWallet } from './useConnectedWallet'

export type ActiveChainState =
  | { type: 'none' }
  | { type: 'ethereum'; chainId: number; name: string; rpcUrl?: string }
  | { type: 'solana'; cluster: SolanaCluster; rpcUrl: string }

export interface UseActiveChainOptions {
  /** Preferred chain when multiple wallets are connected */
  preferredChain?: ChainType
}

/** Hook for getting the currently active chain. */
export function useActiveChain(options?: UseActiveChainOptions): ActiveChainState {
  const wallet = useConnectedWallet({ preferredChain: options?.preferredChain })
  const ethContext = useContext(EthereumContext)
  const solContext = useContext(SolanaContext)

  // Early return if not connected
  if (wallet.status !== 'connected') {
    return { type: 'none' }
  }

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
