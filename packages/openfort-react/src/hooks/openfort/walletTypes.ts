import { type AccountTypeEnum, ChainTypeEnum, type EmbeddedAccount, type RecoveryMethod } from '@openfort/openfort-js'
import type { Hex } from 'viem'
import type { OpenfortEthereumBridgeConnector } from '../../ethereum/OpenfortEthereumBridgeContext'
import type { BaseFlowState } from './auth/status'

export type SimpleAccount = {
  chainId?: number
  id: string
}

export type EthereumUserWallet = {
  address: Hex
  connectorType?: string
  walletClientType?: string
  connector?: OpenfortEthereumBridgeConnector
  id: string
  isAvailable: boolean
  isActive?: boolean
  isConnecting?: boolean

  // From openfort embedded wallet
  accounts: SimpleAccount[]
  recoveryMethod?: RecoveryMethod
  accountId?: string
  accountType?: AccountTypeEnum
  ownerAddress?: Hex
  implementationType?: string
  createdAt?: number
  salt?: string
}

/** Solana embedded wallet shape (mirrors UserWallet for SVM). address is Base58. Discriminate with chainType. */
export type SolanaUserWallet = {
  address: string
  id: string
  chainType: typeof ChainTypeEnum.SVM
  isAvailable: boolean
  isActive?: boolean
  isConnecting?: boolean
  accounts: { id: string }[]
  recoveryMethod?: RecoveryMethod
  accountType?: AccountTypeEnum
  createdAt?: number
}

export type UserWallet = EthereumUserWallet | SolanaUserWallet

export type WalletFlowStatus =
  | BaseFlowState
  | {
      status: 'creating' | 'connecting'
      address?: Hex
      error?: never
    }

/** Build UserWallet from a single EVM embedded account (e.g. for post-auth return). */
export function embeddedAccountToUserWallet(account: EmbeddedAccount): EthereumUserWallet {
  return {
    connectorType: 'embedded',
    walletClientType: 'openfort',
    address: account.address as Hex,
    id: account.id,
    isAvailable: true,
    accounts: [{ id: account.id, chainId: account.chainId }],
    recoveryMethod: account.recoveryMethod,
    accountId: account.id,
    accountType: account.accountType,
    ownerAddress: account.ownerAddress as Hex | undefined,
    implementationType: account.implementationType,
    createdAt: account.createdAt,
    salt: account.salt,
  }
}

/** Build SolanaUserWallet from a single SVM embedded account (e.g. for post-auth return). */
export function embeddedAccountToSolanaUserWallet(account: EmbeddedAccount): SolanaUserWallet {
  return {
    address: account.address,
    id: account.id,
    chainType: ChainTypeEnum.SVM,
    isAvailable: true,
    accounts: [{ id: account.id }],
    recoveryMethod: account.recoveryMethod,
    accountType: account.accountType,
    createdAt: account.createdAt,
  }
}
