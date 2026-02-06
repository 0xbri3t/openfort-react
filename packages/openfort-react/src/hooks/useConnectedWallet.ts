import { ChainTypeEnum } from '@openfort/openfort-js'
import { useContext, useMemo } from 'react'

import { useAuthContext } from '../core/AuthContext'
import { EthereumContext } from '../ethereum/EthereumContext'
import { SolanaContext } from '../solana/providers/SolanaContextProvider'
import type { ChainType, SolanaCluster } from '../utils/chains'
import { formatEVMAddress, formatSolanaAddress } from '../utils/format'

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

interface WalletInternalState {
  status: 'not-created' | 'loading' | 'connected' | 'error'
  address?: string
  chainId?: number
  cluster?: SolanaCluster
}

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

/** Hook for getting unified wallet state across chains. */
export function useConnectedWallet(options?: UseConnectedWalletOptions): ConnectedWalletState {
  const preferredChain = options?.preferredChain ?? 'ethereum'

  const ethWallet = useEthereumWalletInternal()
  const solWallet = useSolanaWalletInternal()

  const walletRegistry = useMemo(() => {
    const registry: [ChainType, WalletInternalState | null, (addr: string) => string][] = []
    if (ethWallet !== null) {
      registry.push(['ethereum', ethWallet, formatEVMAddress])
    }
    if (solWallet !== null) {
      registry.push(['solana', solWallet, formatSolanaAddress])
    }

    return registry
  }, [ethWallet, solWallet])

  const chainPriorities: Record<ChainType, Record<ChainType, number>> = {
    ethereum: { ethereum: 0, solana: 1 },
    solana: { solana: 0, ethereum: 1 },
  }

  const sortedRegistry = useMemo(() => {
    const priorityMap = chainPriorities[preferredChain]
    return [...walletRegistry].sort(([typeA], [typeB]) => {
      return (priorityMap[typeA] ?? 99) - (priorityMap[typeB] ?? 99)
    })
  }, [walletRegistry, preferredChain])

  const chainFieldExtractors: Record<
    ChainType,
    (state: WalletInternalState) => { chainId?: number; cluster?: SolanaCluster }
  > = {
    ethereum: (state) => ({ chainId: state.chainId }),
    solana: (state) => ({ cluster: state.cluster }),
  }

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

  const isLoading = sortedRegistry.some(([_, state]) => state?.status === 'loading')

  return isLoading ? { status: 'loading' } : { status: 'disconnected' }
}
