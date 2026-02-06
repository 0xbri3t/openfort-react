/**
 * Shared types for @openfort/react
 *
 * Base types and interfaces shared between Ethereum and Solana implementations.
 */

import type { EmbeddedAccount, RecoveryParams } from '@openfort/openfort-js'
import type { OpenfortHookOptions } from '../types'

/**
 * Base wallet actions interface
 *
 * Defines the common actions available on all embedded wallets,
 * regardless of chain type (Ethereum or Solana).
 *
 * @typeParam TWallet - Connected wallet type
 * @typeParam TCreateOptions - Wallet creation options
 * @typeParam TSetActiveOptions - Set active wallet options
 */
export interface BaseWalletActions<
  TWallet,
  TCreateOptions extends object = object,
  TSetActiveOptions extends object = object,
> {
  /** Create a new embedded wallet */
  create(options?: TCreateOptions): Promise<EmbeddedAccount>

  /** List of available wallets */
  wallets: TWallet[]

  /** Set the active wallet */
  setActive(options: TSetActiveOptions): Promise<void>

  /** Update recovery method */
  setRecovery(options: BaseSetRecoveryOptions): Promise<void>

  /** Export the private key (requires user confirmation) */
  exportPrivateKey(): Promise<string>
}

/**
 * Base options for setting recovery method
 */
export type BaseSetRecoveryOptions = {
  previousRecovery: RecoveryParams
  newRecovery: RecoveryParams
}

/**
 * Common wallet statuses across all chain types
 */
export type WalletStatus =
  | 'disconnected'
  | 'fetching-wallets'
  | 'connecting'
  | 'reconnecting'
  | 'creating'
  | 'needs-recovery'
  | 'connected'
  | 'error'

/**
 * Chain mode detected by the provider
 */
export type ChainMode = 'ethereum-only' | 'solana-only' | 'multi-chain'

/**
 * Available chains result from useAvailableChains hook
 */
export type AvailableChainsResult = {
  /** Whether Ethereum is available (EthereumContext present) */
  hasEthereum: boolean
  /** Whether Solana is available (SolanaContext present) */
  hasSolana: boolean
  /** List of available chain identifiers */
  availableChains: readonly ('ethereum' | 'solana')[]
  /** Current chain mode */
  mode: ChainMode
}

/**
 * Base create wallet options (shared between chains)
 */
export type BaseCreateWalletOptions<TResult> = {
  /** Recovery password for key encryption */
  recoveryPassword?: string
  /** OTP code for verification */
  otpCode?: string
} & OpenfortHookOptions<TResult>

/**
 * Base set active wallet options (shared between chains)
 */
export type BaseSetActiveWalletOptions = {
  /** Recovery params for wallet access */
  recoveryParams?: RecoveryParams
}
