import { ChainTypeEnum } from '@openfort/openfort-js'
import type { ConnectedEmbeddedEthereumWallet } from '../../ethereum/types'
import type { ConnectedEmbeddedSolanaWallet } from '../../solana/types'
import type { EthereumUserWallet, SolanaUserWallet } from './useWallets'

export function toEthereumUserWallet(w: ConnectedEmbeddedEthereumWallet): EthereumUserWallet {
  return {
    id: w.id,
    address: w.address,
    connectorType: 'embedded',
    walletClientType: 'openfort',
    isAvailable: true,
    accounts: [{ id: w.id }],
    recoveryMethod: w.recoveryMethod,
    ownerAddress: w.ownerAddress as EthereumUserWallet['ownerAddress'],
    implementationType: w.implementationType,
  }
}

export function toSolanaUserWallet(w: ConnectedEmbeddedSolanaWallet): SolanaUserWallet {
  return {
    id: w.id,
    address: w.address,
    chainType: ChainTypeEnum.SVM,
    isAvailable: true,
    accounts: [{ id: w.id }],
    recoveryMethod: w.recoveryMethod,
  }
}
