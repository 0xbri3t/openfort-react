/**
 * useConnectedWallet Hook
 *
 * Unified wallet state across chains using registry pattern.
 * NO if/else chains - uses array/object lookups.
 *
 * @see Phase E1.1
 */

import { ChainTypeEnum } from '@openfort/openfort-js'
import { useContext, useMemo } from 'react'

import { useAuthContext } from '../core/AuthContext'
import { EthereumContext } from '../ethereum/EthereumContext'
import { SolanaContext } from '../solana/providers/SolanaContextProvider'
import type { ChainType, SolanaCluster } from '../utils/chains'
import { formatEVMAddress, formatSolanaAddress } from '../utils/format'

// =============================================================================
// Types
// =============================================================================

/**
 * Connected wallet state - discriminated union
 */
export type ConnectedWalletState =
  | { status: 'disconnected' }
  | { status: 'loading' }
  | {
      status: 'connected'
      address: string
      chainType: ChainType
      chainId?: number
      cluster?: SolanaCluster
      displayAddress: string
    }

export interface UseConnectedWalletOptions {
  /** Preferred chain when multiple wallets are connected */
  preferredChain?: ChainType
}

// =============================================================================
// Internal Types
// =============================================================================

interface WalletInternalState {
  status: 'not-created' | 'loading' | 'connected' | 'error'
  address?: string
  chainId?: number
  cluster?: SolanaCluster
}

// =============================================================================
// Internal Hooks (Private)
// =============================================================================

function useEthereumWalletInternal(): WalletInternalState | null {
  const context = useContext(EthereumContext)
  const { embeddedAccounts, isLoadingAccounts } = useAuthContext()

  // No context = Ethereum not configured
  if (!context) return null

  // Get Ethereum embedded accounts
  const ethAccounts = embeddedAccounts?.filter((a) => a.chainType === ChainTypeEnum.EVM) ?? []

  if (isLoadingAccounts) {
    return { status: 'loading' }
  }

  if (ethAccounts.length === 0) {
    return { status: 'not-created' }
  }

  const activeAccount = ethAccounts[0]
  return {
    status: 'connected',
    address: activeAccount.address,
    chainId: context.chainId,
  }
}

function useSolanaWalletInternal(): WalletInternalState | null {
  const context = useContext(SolanaContext)
  const { embeddedAccounts, isLoadingAccounts } = useAuthContext()

  // No context = Solana not configured
  if (!context) return null

  // Get Solana embedded accounts
  const solAccounts = embeddedAccounts?.filter((a) => a.chainType === ChainTypeEnum.SVM) ?? []

  if (isLoadingAccounts) {
    return { status: 'loading' }
  }

  if (solAccounts.length === 0) {
    return { status: 'not-created' }
  }

  const activeAccount = solAccounts[0]
  return {
    status: 'connected',
    address: activeAccount.address,
    cluster: context.cluster,
  }
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Hook for getting unified wallet state across chains.
 *
 * Uses registry pattern for scalability - easy to add new chains.
 *
 * @example Basic usage
 * ```tsx
 * function WalletStatus() {
 *   const wallet = useConnectedWallet();
 *
 *   switch (wallet.status) {
 *     case 'disconnected':
 *       return <p>Not connected</p>;
 *     case 'loading':
 *       return <p>Loading...</p>;
 *     case 'connected':
 *       return <p>Address: {wallet.displayAddress}</p>;
 *   }
 * }
 * ```
 *
 * @example With preferred chain
 * ```tsx
 * const wallet = useConnectedWallet({ preferredChain: 'solana' });
 * ```
 */
export function useConnectedWallet(options?: UseConnectedWalletOptions): ConnectedWalletState {
  const preferredChain = options?.preferredChain ?? 'ethereum'

  // ALWAYS call hooks unconditionally (React rules compliant)
  const ethWallet = useEthereumWalletInternal()
  const solWallet = useSolanaWalletInternal()

  // Build wallet registry - scalable, no if/else chains
  const walletRegistry = useMemo(() => {
    const registry: [ChainType, WalletInternalState | null, (addr: string) => string][] = []

    // Only add to registry if wallet state exists (context was mounted)
    if (ethWallet !== null) {
      registry.push(['ethereum', ethWallet, formatEVMAddress])
    }
    if (solWallet !== null) {
      registry.push(['solana', solWallet, formatSolanaAddress])
    }

    return registry
  }, [ethWallet, solWallet])

  // Chain priority registry (no if/else)
  const chainPriorities: Record<ChainType, Record<ChainType, number>> = {
    ethereum: { ethereum: 0, solana: 1 },
    solana: { solana: 0, ethereum: 1 },
  }

  // Sort by preference using registry
  const sortedRegistry = useMemo(() => {
    const priorityMap = chainPriorities[preferredChain]
    return [...walletRegistry].sort(([typeA], [typeB]) => {
      return (priorityMap[typeA] ?? 99) - (priorityMap[typeB] ?? 99)
    })
  }, [walletRegistry, preferredChain])

  // Chain-specific field extractors (registry pattern)
  const chainFieldExtractors: Record<
    ChainType,
    (state: WalletInternalState) => { chainId?: number; cluster?: SolanaCluster }
  > = {
    ethereum: (state) => ({ chainId: state.chainId }),
    solana: (state) => ({ cluster: state.cluster }),
  }

  // Find first connected wallet using array find (no for loop with early return)
  const connectedEntry = sortedRegistry.find(([_, state]) => state?.status === 'connected' && state?.address)

  if (connectedEntry) {
    const [chainType, state, formatFn] = connectedEntry
    if (state?.address) {
      const chainFields = chainFieldExtractors[chainType](state)
      return {
        status: 'connected',
        address: state.address,
        chainType,
        ...chainFields,
        displayAddress: formatFn(state.address),
      }
    }
  }

  // Check if any are loading using array some (no for loop)
  const isLoading = sortedRegistry.some(([_, state]) => state?.status === 'loading')

  return isLoading ? { status: 'loading' } : { status: 'disconnected' }
}
