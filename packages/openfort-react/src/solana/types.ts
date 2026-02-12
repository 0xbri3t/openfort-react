/**
 * Solana-specific types for @openfort/react/solana
 *
 * These types define the Solana wallet state machine and related interfaces.
 */

import type { ChainTypeEnum, EmbeddedAccount, RecoveryMethod, RecoveryParams } from '@openfort/openfort-js'
import type React from 'react'
import type { SetRecoveryOptions as SetRecoveryOptionsBase } from '../shared/types'
import type { OpenfortHookOptions } from '../types'

/**
 * Solana cluster identifier
 */
export type SolanaCluster = 'mainnet-beta' | 'devnet' | 'testnet' | 'custom'

/**
 * Custom cluster entry for the cluster switcher
 */
export type SolanaClusterConfig = {
  /** Display name (e.g. "My Devnet") */
  name: string
  /** Network identifier for explorer links etc. */
  cluster: SolanaCluster
  /** RPC endpoint (required for custom clusters) */
  rpcUrl: string
  /** Optional WebSocket URL */
  wsUrl?: string
}

/**
 * Solana commitment level for transactions
 */
export type SolanaCommitment = 'processed' | 'confirmed' | 'finalized'

/**
 * UI options for Solana-connected views (e.g. SolanaConnected page)
 */
export type SolanaUIOptions = {
  /** When true, hide the cluster badge and switch button */
  hideClusterSelector?: boolean
  /** Custom avatar component; receives address for display */
  customAvatar?: React.ComponentType<{ address: string }>
}

/**
 * Configuration for Solana support in OpenfortProvider
 *
 * @example
 * ```tsx
 * <OpenfortProvider
 *   publishableKey="pk_..."
 *   walletConfig={{
 *     shieldPublishableKey: 'shield_pk_...',
 *     solana: {
 *       cluster: 'mainnet-beta',
 *       commitment: 'confirmed'
 *     }
 *   }}
 * >
 * ```
 */
export type SolanaConfig = {
  /** Solana cluster to connect to */
  cluster: SolanaCluster
  /** Custom RPC URL (optional, defaults to public RPC) */
  rpcUrl?: string
  /** Commitment level for transactions (default: 'confirmed') */
  commitment?: SolanaCommitment
  /** Custom cluster options for the cluster switcher */
  customClusters?: SolanaClusterConfig[]
  /** UI options for Solana-connected screens */
  ui?: SolanaUIOptions
}

/**
 * Solana transaction formats supported by the provider
 *
 * Supports both @solana/kit format and raw bytes.
 */
export type SolanaTransaction =
  | { messageBytes: Uint8Array } // @solana/kit format
  | { serializeMessage(): Uint8Array } // @solana/web3.js Transaction
  | Uint8Array // Raw bytes

/**
 * Signed Solana transaction result
 */
export type SignedSolanaTransaction = {
  /** Base58 encoded signature */
  signature: string
  /** Base58 encoded public key of signer */
  publicKey: string
}

/**
 * Request to sign a message
 */
export type SolanaSignMessageRequest = {
  method: 'signMessage'
  params: { message: string }
}

/**
 * Request to sign a transaction
 */
export type SolanaSignTransactionRequest = {
  method: 'signTransaction'
  params: { transaction: SolanaTransaction }
}

/**
 * Request to sign multiple transactions
 */
export type SolanaSignAllTransactionsRequest = {
  method: 'signAllTransactions'
  params: { transactions: SolanaTransaction[] }
}

export type SolanaProviderRequest =
  | SolanaSignMessageRequest
  | SolanaSignTransactionRequest
  | SolanaSignAllTransactionsRequest

/**
 * Solana embedded wallet provider
 *
 * Provides signing capabilities for Solana transactions and messages.
 * Can be used directly or wrapped with Kit signers.
 *
 * @example Direct usage
 * ```tsx
 * if (solana.status === 'connected') {
 *   const signature = await solana.provider.signMessage('Hello Solana!');
 * }
 * ```
 *
 * @example With Kit Signer
 * ```tsx
 * const signer = useSolanaSigner();
 * if (signer) {
 *   // Use with @solana/kit
 * }
 * ```
 */
export interface OpenfortEmbeddedSolanaWalletProvider {
  /** Public key of the wallet (Base58 encoded) */
  readonly publicKey: string

  /**
   * Sign a message
   * @param message - Message to sign (UTF-8 string)
   * @returns Base58 encoded signature
   */
  signMessage(message: string): Promise<string>

  /**
   * Sign a single transaction
   * @param transaction - Transaction to sign
   * @returns Signed transaction with signature and public key
   */
  signTransaction(transaction: SolanaTransaction): Promise<SignedSolanaTransaction>

  /**
   * Sign multiple transactions atomically
   * @param transactions - Array of transactions to sign
   * @returns Array of signed transactions
   */
  signAllTransactions(transactions: SolanaTransaction[]): Promise<SignedSolanaTransaction[]>

  /**
   * Request-based API (EIP-1193 style)
   */
  request(args: SolanaSignMessageRequest): Promise<{ signature: string }>
  request(args: SolanaSignTransactionRequest): Promise<{ signedTransaction: SignedSolanaTransaction }>
  request(args: SolanaSignAllTransactionsRequest): Promise<{ signedTransactions: SignedSolanaTransaction[] }>
}

/**
 * Connected Solana embedded wallet
 */
export type ConnectedEmbeddedSolanaWallet = {
  /** Embedded account id (from Openfort) */
  id: string
  /** Solana address in Base58 format */
  address: string
  /** Chain type discriminator */
  chainType: typeof ChainTypeEnum.SVM
  /** Wallet index (for multiple wallets) */
  walletIndex: number
  /** Recovery method for this wallet */
  recoveryMethod?: RecoveryMethod
  /** Get the Solana wallet provider */
  getProvider(): Promise<OpenfortEmbeddedSolanaWalletProvider>
}

/**
 * Result of creating a Solana wallet
 */
export type CreateSolanaWalletResult = {
  account: EmbeddedAccount
  error?: string
}

/**
 * Options for creating a Solana embedded wallet.
 * Solana wallets are EOA; the same wallet works across all clusters.
 */
export type CreateSolanaWalletOptions = {
  /** Recovery method for key encryption */
  recoveryMethod?: RecoveryMethod
  /** Passkey ID for PASSKEY recovery */
  passkeyId?: string
  /** Recovery password for PASSWORD method */
  recoveryPassword?: string
  /** OTP code for AUTOMATIC method */
  otpCode?: string
} & OpenfortHookOptions<CreateSolanaWalletResult>

/**
 * Options for setting active Solana wallet
 */
export type SetActiveSolanaWalletOptions = {
  /** Wallet address to set as active (Base58) */
  address: string
  /** Recovery params for wallet access (escape hatch; prefer named options) */
  recoveryParams?: RecoveryParams
  /** Recovery method when recoveryParams not provided */
  recoveryMethod?: RecoveryMethod
  /** Passkey ID for PASSKEY recovery */
  passkeyId?: string
  /** Password for PASSWORD recovery */
  password?: string
  /** Alias for password (react-native parity) */
  recoveryPassword?: string
  /** OTP code for AUTOMATIC recovery */
  otpCode?: string
}

/**
 * Actions available on Solana embedded wallets
 */
export interface SolanaWalletActions {
  /** Create a new Solana embedded wallet */
  create(options?: CreateSolanaWalletOptions): Promise<EmbeddedAccount>
  /** List of available Solana wallets */
  wallets: ConnectedEmbeddedSolanaWallet[]
  /** Set the active wallet */
  setActive(options: SetActiveSolanaWalletOptions): Promise<void>
  /** Update recovery method */
  setRecovery(options: SetRecoveryOptionsBase): Promise<void>
  /** Export the private key (requires user confirmation) */
  exportPrivateKey(): Promise<string>
}

export type EmbeddedSolanaWalletState =
  | (SolanaWalletActions & { status: 'disconnected'; activeWallet: null })
  | (SolanaWalletActions & { status: 'fetching-wallets'; activeWallet: null })
  | (SolanaWalletActions & { status: 'connecting'; activeWallet: ConnectedEmbeddedSolanaWallet })
  | (SolanaWalletActions & { status: 'reconnecting'; activeWallet: ConnectedEmbeddedSolanaWallet })
  | (SolanaWalletActions & { status: 'creating'; activeWallet: null })
  | (SolanaWalletActions & { status: 'needs-recovery'; activeWallet: ConnectedEmbeddedSolanaWallet })
  | (SolanaWalletActions & {
      status: 'connected'
      activeWallet: ConnectedEmbeddedSolanaWallet
      provider: OpenfortEmbeddedSolanaWalletProvider
    })
  | (SolanaWalletActions & {
      status: 'error'
      activeWallet: ConnectedEmbeddedSolanaWallet | null
      error: string
    })

/**
 * Options for useSolanaEmbeddedWallet hook
 */
export type UseEmbeddedSolanaWalletOptions = {
  /** Recovery params for wallet access */
  recoveryParams?: RecoveryParams
}

/**
 * Address type (Base58 encoded string branded type)
 * Compatible with @solana/kit Address type
 */
export type SolanaAddress = string & { readonly __brand: 'Address' }

/**
 * Signature dictionary type for Kit signers
 */
export type SignatureDictionary = Readonly<Record<string, string>>
