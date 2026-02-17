import { ChainTypeEnum, type EmbeddedAccount, EmbeddedState } from '@openfort/openfort-js'
import { useContext } from 'react'
import { embeddedWalletId } from '../constants/openfort'
import { useConnectionStrategy } from '../core/ConnectionStrategyContext'
import { OpenfortEthereumBridgeContext } from '../ethereum/OpenfortEthereumBridgeContext'
import { useOpenfortCore } from '../openfort/useOpenfort'
import { useChain } from '../shared/hooks/useChain'
import { SolanaContext } from '../solana/SolanaContext'
import type { SolanaCluster } from '../solana/types'
import { formatAddress } from '../utils/format'

function accountsForChain(accounts: EmbeddedAccount[] | undefined, chainType: ChainTypeEnum): EmbeddedAccount[] {
  return accounts?.filter((a) => a.chainType === chainType) ?? []
}

export type WalletType = 'embedded' | 'external'

export type ConnectedWalletStatus = 'connected' | 'connecting' | 'disconnected' | 'reconnecting'

export type ConnectedWalletState =
  | {
      status: 'disconnected'
      normalizedStatus: 'disconnected'
      walletType: null
      isConnected: false
      isConnecting: false
      isDisconnected: true
      isReconnecting: false
      isEmbedded: false
      isExternal: false
    }
  | {
      status: 'loading'
      normalizedStatus: 'connecting'
      walletType: null
      isConnected: false
      isConnecting: true
      isDisconnected: false
      isReconnecting: false
      isEmbedded: false
      isExternal: false
    }
  | {
      status: 'connected'
      normalizedStatus: 'connected'
      address: string
      chainType: ChainTypeEnum
      chainId?: number
      cluster?: SolanaCluster
      displayAddress: string
      walletType: WalletType
      connectorId?: string
      connectorName?: string
      isConnected: true
      isConnecting: false
      isDisconnected: false
      isReconnecting: false
      isEmbedded: boolean
      isExternal: boolean
    }

interface WalletInternalState {
  status: 'not-created' | 'loading' | 'connected' | 'error'
  address?: string
  chainId?: number
  cluster?: SolanaCluster
  walletType?: WalletType
  connectorId?: string
  connectorName?: string
}

function useEthereumWalletFromStrategy(): WalletInternalState | null {
  const strategy = useConnectionStrategy()
  const core = useOpenfortCore()
  const bridge = useContext(OpenfortEthereumBridgeContext)
  const { chainType } = useChain()

  if (!strategy || chainType !== ChainTypeEnum.EVM) return null

  const state = {
    user: core.user,
    embeddedAccounts: core.embeddedAccounts,
    activeEmbeddedAddress: core.activeEmbeddedAddress,
    chainType,
  }

  if (core.isLoadingAccounts) return { status: 'loading' }
  if (
    strategy.kind === 'bridge' &&
    core.walletStatus &&
    (core.walletStatus.status === 'creating' || core.walletStatus.status === 'connecting')
  ) {
    return { status: 'loading' }
  }
  if (strategy.kind === 'bridge' && bridge && (bridge.account.isConnecting || bridge.account.isReconnecting)) {
    return { status: 'loading' }
  }
  if (!strategy.isConnected(state)) return { status: 'not-created' }

  const address = strategy.getAddress(state)
  const chainId = core?.activeChainId ?? strategy.getChainId()
  if (!address) return { status: 'not-created' }

  let walletType: WalletType = 'embedded'
  let connectorId: string | undefined = embeddedWalletId
  let connectorName: string | undefined = 'Openfort'

  if (strategy.kind === 'bridge' && bridge) {
    const bridgeConnector = bridge.account.connector
    const isEmbedded =
      bridgeConnector?.id === embeddedWalletId ||
      (core.activeEmbeddedAddress != null && core.activeEmbeddedAddress.toLowerCase() === address.toLowerCase())

    if (isEmbedded) {
      walletType = 'embedded'
      connectorId = embeddedWalletId
      connectorName = 'Openfort'
    } else {
      walletType = 'external'
      connectorId = bridgeConnector?.id
      connectorName = bridgeConnector?.name
    }
  }

  return { status: 'connected', address, chainId, walletType, connectorId, connectorName }
}

function useSolanaWalletInternal(): WalletInternalState | null {
  const context = useContext(SolanaContext)
  const { embeddedAccounts, isLoadingAccounts, activeEmbeddedAddress, embeddedState } = useOpenfortCore()

  if (!context) return null

  const solAccounts = accountsForChain(embeddedAccounts, ChainTypeEnum.SVM)

  if (isLoadingAccounts) return { status: 'loading' }
  if (solAccounts.length === 0) return { status: 'not-created' }

  const activeAccount = activeEmbeddedAddress
    ? solAccounts.find((a) => a.address.toLowerCase() === activeEmbeddedAddress.toLowerCase())
    : undefined
  if (!activeAccount) return { status: 'not-created' }
  if (embeddedState !== EmbeddedState.READY) return { status: 'not-created' }

  return {
    status: 'connected',
    address: activeAccount.address,
    cluster: context.cluster,
    walletType: 'embedded' as const,
    connectorId: embeddedWalletId,
    connectorName: 'Openfort',
  }
}

function toConnectedState(chainType: ChainTypeEnum, wallet: WalletInternalState | null): ConnectedWalletState {
  if (wallet?.status === 'loading') {
    return {
      status: 'loading',
      normalizedStatus: 'connecting',
      walletType: null,
      isConnected: false,
      isConnecting: true,
      isDisconnected: false,
      isReconnecting: false,
      isEmbedded: false,
      isExternal: false,
    }
  }
  if (wallet?.status === 'connected' && wallet.address) {
    const wt = wallet.walletType ?? 'embedded'
    return {
      status: 'connected',
      normalizedStatus: 'connected',
      address: wallet.address,
      chainType,
      ...(chainType === ChainTypeEnum.EVM && { chainId: wallet.chainId }),
      ...(chainType === ChainTypeEnum.SVM && { cluster: wallet.cluster }),
      displayAddress: formatAddress(wallet.address, chainType),
      walletType: wt,
      connectorId: wallet.connectorId,
      connectorName: wallet.connectorName,
      isConnected: true,
      isConnecting: false,
      isDisconnected: false,
      isReconnecting: false,
      isEmbedded: wt === 'embedded',
      isExternal: wt === 'external',
    }
  }
  return {
    status: 'disconnected',
    normalizedStatus: 'disconnected',
    walletType: null,
    isConnected: false,
    isConnecting: false,
    isDisconnected: true,
    isReconnecting: false,
    isEmbedded: false,
    isExternal: false,
  }
}

export function useConnectedWalletState(): ConnectedWalletState {
  const { chainType } = useChain()
  const ethWallet = useEthereumWalletFromStrategy()
  const solWallet = useSolanaWalletInternal()

  const walletByChain: Record<ChainTypeEnum, WalletInternalState | null> = {
    [ChainTypeEnum.EVM]: ethWallet,
    [ChainTypeEnum.SVM]: solWallet,
  }

  return toConnectedState(chainType, walletByChain[chainType])
}
