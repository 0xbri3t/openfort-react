/**
 * Ethereum-specific types for @openfort/react/ethereum
 *
 * These types define the Ethereum wallet state machine and related interfaces.
 */

import type { ChainTypeEnum, EmbeddedAccount, RecoveryMethod, RecoveryParams } from '@openfort/openfort-js'
import type { SetRecoveryOptions as SharedSetRecoveryOptions } from '../shared/types'
import type { OpenfortHookOptions } from '../types'

/**
 * EIP-1193 Provider interface for Ethereum wallets
 */
export interface OpenfortEmbeddedEthereumWalletProvider {
  request(args: EIP1193RequestArguments): Promise<unknown>
  on(event: EIP1193EventName | string, handler: EIP1193EventHandler): void
  removeListener(event: EIP1193EventName | string, handler: EIP1193EventHandler): void
}

export type EIP1193RequestArguments = {
  readonly method: string
  readonly params?: readonly unknown[] | object
}

export type EIP1193EventName = 'accountsChanged' | 'chainChanged' | 'connect' | 'disconnect' | 'message'

export type EIP1193EventHandler = (...args: unknown[]) => void

/**
 * Connected Ethereum embedded wallet
 */
export type ConnectedEmbeddedEthereumWallet = {
  /** Embedded account id (from Openfort) */
  id: string
  /** Ethereum address in hex format */
  address: `0x${string}`
  /** Owner address for Smart Accounts */
  ownerAddress?: string
  /** Smart Account implementation type */
  implementationType?: string
  /** Chain type discriminator */
  chainType: typeof ChainTypeEnum.EVM
  /** Wallet index (for multiple wallets) */
  walletIndex: number
  /** Recovery method for this wallet */
  recoveryMethod?: RecoveryMethod
  /** Get the EIP-1193 provider */
  getProvider(): Promise<OpenfortEmbeddedEthereumWalletProvider>
}

/**
 * Result of creating an Ethereum wallet
 */
export type CreateEthereumWalletResult = {
  account: EmbeddedAccount
  error?: string
}

/**
 * Options for creating an Ethereum embedded wallet
 */
export type CreateEthereumWalletOptions = {
  /** Target chain ID for deployment */
  chainId?: number
  /** Recovery method for key encryption */
  recoveryMethod?: RecoveryMethod
  /** Passkey ID for PASSKEY recovery */
  passkeyId?: string
  /** Recovery password for key encryption */
  recoveryPassword?: string
  /** OTP code for verification */
  otpCode?: string
  /** Account type (Smart Account or EOA) */
  accountType?: 'SMART_ACCOUNT' | 'EOA'
  /** Policy ID for gas sponsorship */
  policyId?: string
} & OpenfortHookOptions<CreateEthereumWalletResult>

/**
 * Options for setting active Ethereum wallet
 */
export type SetActiveEthereumWalletOptions = {
  /** Wallet address to set as active */
  address: `0x${string}`
  /** Chain ID (required for Smart Accounts) */
  chainId?: number
  /** Recovery params for wallet access (escape hatch; prefer named options) */
  recoveryParams?: RecoveryParams
  /** Recovery method when recoveryParams not provided */
  recoveryMethod?: RecoveryMethod
  /** Passkey ID for PASSKEY recovery */
  passkeyId?: string
  /** Password for PASSWORD recovery */
  recoveryPassword?: string
  /** OTP code for AUTOMATIC recovery */
  otpCode?: string
}

/**
 * Actions available on Ethereum embedded wallets
 */
export interface EthereumWalletActions {
  /** Create a new Ethereum embedded wallet */
  create(options?: CreateEthereumWalletOptions): Promise<EmbeddedAccount>
  /** List of available Ethereum wallets */
  wallets: ConnectedEmbeddedEthereumWallet[]
  /** Set the active wallet */
  setActive(options: SetActiveEthereumWalletOptions): Promise<void>
  /** Update recovery method */
  setRecovery(options: SharedSetRecoveryOptions): Promise<void>
  /** Export the private key (requires user confirmation) */
  exportPrivateKey(): Promise<string>
}

/** Re-export for backward compatibility */
export type SetRecoveryOptions = SharedSetRecoveryOptions

export type EmbeddedEthereumWalletState =
  | (EthereumWalletActions & { status: 'disconnected'; activeWallet: null })
  | (EthereumWalletActions & { status: 'fetching-wallets'; activeWallet: null })
  | (EthereumWalletActions & { status: 'connecting'; activeWallet: ConnectedEmbeddedEthereumWallet })
  | (EthereumWalletActions & { status: 'reconnecting'; activeWallet: ConnectedEmbeddedEthereumWallet })
  | (EthereumWalletActions & { status: 'creating'; activeWallet: null })
  | (EthereumWalletActions & { status: 'needs-recovery'; activeWallet: ConnectedEmbeddedEthereumWallet })
  | (EthereumWalletActions & {
      status: 'connected'
      activeWallet: ConnectedEmbeddedEthereumWallet
      provider: OpenfortEmbeddedEthereumWalletProvider
    })
  | (EthereumWalletActions & {
      status: 'error'
      activeWallet: ConnectedEmbeddedEthereumWallet | null
      error: string
    })

export type UseEmbeddedEthereumWalletOptions = {
  /** Chain ID for smart account operations */
  chainId?: number
  /** Recovery params for wallet access */
  recoveryParams?: RecoveryParams
}
