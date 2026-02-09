import { ChainTypeEnum } from '@openfort/openfort-js'
import { useContext } from 'react'

import { useAuthContext } from '../core/AuthContext'
import { EthereumContext } from '../ethereum/EthereumContext'
import { useChain } from '../shared/hooks/useChain'
import { SolanaContext } from '../solana/providers/SolanaContextProvider'
import type { SolanaCluster } from '../solana/types'
import { formatEVMAddress, formatSolanaAddress } from '../utils/format'

export type ConnectedWalletState =
  | { status: 'disconnected' }
  | { status: 'loading' }
  | {
      status: 'connected'
      address: string
      chainType: ChainTypeEnum
      chainId?: number
      cluster?: SolanaCluster
      displayAddress: string
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

  if (!context) return null

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

  if (!context) return null

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

export function useConnectedWallet(): ConnectedWalletState {
  const { chainType } = useChain()
  const ethWallet = useEthereumWalletInternal()
  const solWallet = useSolanaWalletInternal()

  if (chainType === ChainTypeEnum.EVM) {
    if (ethWallet?.status === 'connected' && ethWallet.address) {
      return {
        status: 'connected',
        address: ethWallet.address,
        chainType: ChainTypeEnum.EVM,
        chainId: ethWallet.chainId,
        displayAddress: formatEVMAddress(ethWallet.address),
      }
    }
    if (ethWallet?.status === 'loading') return { status: 'loading' }
    return { status: 'disconnected' }
  }

  if (solWallet?.status === 'connected' && solWallet.address) {
    return {
      status: 'connected',
      address: solWallet.address,
      chainType: ChainTypeEnum.SVM,
      cluster: solWallet.cluster,
      displayAddress: formatSolanaAddress(solWallet.address),
    }
  }
  if (solWallet?.status === 'loading') return { status: 'loading' }
  return { status: 'disconnected' }
}
