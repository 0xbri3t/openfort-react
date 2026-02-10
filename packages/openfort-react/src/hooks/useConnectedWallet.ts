import { ChainTypeEnum, type EmbeddedAccount } from '@openfort/openfort-js'
import { useContext } from 'react'
import { useConnectionStrategy } from '../core/ConnectionStrategyContext'
import { useOpenfortCore } from '../openfort/useOpenfort'
import { useChain } from '../shared/hooks/useChain'
import { SolanaContext } from '../solana/providers/SolanaContextProvider'
import type { SolanaCluster } from '../solana/types'
import { formatAddress } from '../utils/format'

function accountsForChain(accounts: EmbeddedAccount[] | undefined, chainType: ChainTypeEnum): EmbeddedAccount[] {
  return accounts?.filter((a) => a.chainType === chainType) ?? []
}

/** Normalized status (wagmi-compatible). 'loading' is exposed as 'connecting'. */
export type ConnectedWalletStatus = 'connected' | 'connecting' | 'disconnected' | 'reconnecting'

export type ConnectedWalletState =
  | {
      status: 'disconnected'
      /** @see ConnectedWalletStatus */
      normalizedStatus: 'disconnected'
      isConnected: false
      isConnecting: false
      isDisconnected: true
      isReconnecting: false
    }
  | {
      status: 'loading'
      normalizedStatus: 'connecting'
      isConnected: false
      isConnecting: true
      isDisconnected: false
      isReconnecting: false
    }
  | {
      status: 'connected'
      normalizedStatus: 'connected'
      address: string
      chainType: ChainTypeEnum
      chainId?: number
      cluster?: SolanaCluster
      displayAddress: string
      isConnected: true
      isConnecting: false
      isDisconnected: false
      isReconnecting: false
    }

interface WalletInternalState {
  status: 'not-created' | 'loading' | 'connected' | 'error'
  address?: string
  chainId?: number
  cluster?: SolanaCluster
}

function useEthereumWalletFromStrategy(): WalletInternalState | null {
  const strategy = useConnectionStrategy()
  const core = useOpenfortCore()
  const { chainType } = useChain()

  if (!strategy || chainType !== ChainTypeEnum.EVM) return null

  const state = {
    user: core.user,
    embeddedAccounts: core.embeddedAccounts,
    activeEmbeddedAddress: core.activeEmbeddedAddress,
    chainType,
  }

  if (core.isLoadingAccounts) return { status: 'loading' }
  if (!strategy.isConnected(state)) return { status: 'not-created' }

  const address = strategy.getAddress(state)
  const chainId = strategy.getChainId()
  if (!address) return { status: 'not-created' }

  return { status: 'connected', address, chainId }
}

function useSolanaWalletInternal(): WalletInternalState | null {
  const context = useContext(SolanaContext)
  const { embeddedAccounts, isLoadingAccounts } = useOpenfortCore()

  if (!context) return null

  const solAccounts = accountsForChain(embeddedAccounts, ChainTypeEnum.SVM)

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

function toConnectedState(chainType: ChainTypeEnum, wallet: WalletInternalState | null): ConnectedWalletState {
  if (wallet?.status === 'loading') {
    return {
      status: 'loading',
      normalizedStatus: 'connecting',
      isConnected: false,
      isConnecting: true,
      isDisconnected: false,
      isReconnecting: false,
    }
  }
  if (wallet?.status === 'connected' && wallet.address) {
    return {
      status: 'connected',
      normalizedStatus: 'connected',
      address: wallet.address,
      chainType,
      ...(chainType === ChainTypeEnum.EVM && { chainId: wallet.chainId }),
      ...(chainType === ChainTypeEnum.SVM && { cluster: wallet.cluster }),
      displayAddress: formatAddress(wallet.address, chainType),
      isConnected: true,
      isConnecting: false,
      isDisconnected: false,
      isReconnecting: false,
    }
  }
  return {
    status: 'disconnected',
    normalizedStatus: 'disconnected',
    isConnected: false,
    isConnecting: false,
    isDisconnected: true,
    isReconnecting: false,
  }
}

export function useConnectedWallet(): ConnectedWalletState {
  const { chainType } = useChain()
  const ethWallet = useEthereumWalletFromStrategy()
  const solWallet = useSolanaWalletInternal()

  const walletByChain: Record<ChainTypeEnum, WalletInternalState | null> = {
    [ChainTypeEnum.EVM]: ethWallet,
    [ChainTypeEnum.SVM]: solWallet,
  }

  return toConnectedState(chainType, walletByChain[chainType])
}
