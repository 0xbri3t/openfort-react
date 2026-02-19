import { ChainTypeEnum } from '@openfort/openfort-js'
import type { ConnectedEmbeddedSolanaWallet } from '../../solana/types'
import type { SolanaUserWallet } from './walletTypes'

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
