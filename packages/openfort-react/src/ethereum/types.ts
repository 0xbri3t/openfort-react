/**
 * Ethereum-specific types for @openfort/react/ethereum
 *
 * These types define the Ethereum wallet state machine and related interfaces.
 */

import type {
  AccountTypeEnum,
  ChainTypeEnum,
  EmbeddedAccount,
  RecoveryMethod,
  RecoveryParams,
} from '@openfort/openfort-js'
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

type SimpleAccount = {
  id: string
  chainId?: number
}

export type ConnectedEmbeddedEthereumWallet = {
  id: string
  address: `0x${string}`
  ownerAddress?: string
  implementationType?: string
  chainType: typeof ChainTypeEnum.EVM
  walletIndex: number
  recoveryMethod?: RecoveryMethod
  getProvider(): Promise<OpenfortEmbeddedEthereumWalletProvider>
  isAvailable: boolean
  isActive: boolean
  isConnecting: boolean
  accounts: SimpleAccount[]
  connectorType?: string
  walletClientType?: string
  accountId?: string
  accountType?: AccountTypeEnum
  createdAt?: number
  salt?: string
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

export type EthereumWalletStateBase =
  | (EthereumWalletActions & {
      status: 'disconnected'
      activeWallet: null
      address?: never
      chainId?: never
      displayAddress?: never
    })
  | (EthereumWalletActions & {
      status: 'fetching-wallets'
      activeWallet: null
      address?: never
      chainId?: never
      displayAddress?: never
    })
  | (EthereumWalletActions & {
      status: 'connecting'
      activeWallet: ConnectedEmbeddedEthereumWallet
      address: `0x${string}`
      chainId?: number
      displayAddress: string
    })
  | (EthereumWalletActions & {
      status: 'reconnecting'
      activeWallet: ConnectedEmbeddedEthereumWallet
      address: `0x${string}`
      chainId?: number
      displayAddress: string
    })
  | (EthereumWalletActions & {
      status: 'creating'
      activeWallet: null
      address?: never
      chainId?: never
      displayAddress?: never
    })
  | (EthereumWalletActions & {
      status: 'needs-recovery'
      activeWallet: ConnectedEmbeddedEthereumWallet
      address?: `0x${string}`
      chainId?: number
      displayAddress?: string
    })
  | (EthereumWalletActions & {
      status: 'connected'
      activeWallet: ConnectedEmbeddedEthereumWallet
      provider: OpenfortEmbeddedEthereumWalletProvider
      address: `0x${string}`
      chainId: number
      displayAddress: string
    })
  | (EthereumWalletActions & {
      status: 'error'
      activeWallet: ConnectedEmbeddedEthereumWallet | null
      error: string
      address?: `0x${string}`
      chainId?: number
      displayAddress?: string
    })

/** Derived booleans for consistent hook shape. All variants include these. */
export type EthereumWalletDerived = {
  /** True when status is fetching-wallets, connecting, creating, or reconnecting. */
  isLoading: boolean
  /** True when status is 'error'. */
  isError: boolean
  /** True when status is 'connected'. */
  isSuccess: boolean
}

/** Connected wallet state properties (merged from useConnectedWallet) */
export type EthereumConnectedWalletState = {
  /** Normalized status (wagmi-compatible): 'connected', 'connecting', 'disconnected', 'reconnecting'. */
  normalizedStatus: 'connected' | 'connecting' | 'disconnected' | 'reconnecting'
  /** Which wallet type is currently active: 'embedded' (Openfort) or 'external' (MetaMask, WalletConnect, etc.). */
  walletType: 'embedded' | 'external' | null
  /** Connector ID when connected (embeddedWalletId for embedded, external connector id otherwise). */
  connectorId?: string
  /** Connector name when connected (e.g. 'Openfort', 'MetaMask'). */
  connectorName?: string
  /** True when currently connected. */
  isConnected: boolean
  /** True when actively connecting or transitioning. */
  isConnecting: boolean
  /** True when disconnected. */
  isDisconnected: boolean
  /** True when reconnecting after loss of connection. */
  isReconnecting: boolean
}

export type EthereumWalletState = EthereumWalletStateBase & EthereumWalletDerived & EthereumConnectedWalletState

export type UseEmbeddedEthereumWalletOptions = {
  /** Chain ID for smart account operations */
  chainId?: number
  /** Recovery params for wallet access */
  recoveryParams?: RecoveryParams
}
