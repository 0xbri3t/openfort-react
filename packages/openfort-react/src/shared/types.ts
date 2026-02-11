/**
 * Shared types for @openfort/react
 *
 * Base types and interfaces shared between Ethereum and Solana implementations.
 */

import type { EmbeddedAccount, RecoveryMethod, RecoveryParams } from '@openfort/openfort-js'
import type { OpenfortHookOptions } from '../types'

export type RecoverableWallet = {
  address: string
  id: string
  recoveryMethod?: RecoveryMethod
  accounts: { id: string }[]
}

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
  setRecovery(options: SetRecoveryOptions): Promise<void>

  /** Export the private key (requires user confirmation) */
  exportPrivateKey(): Promise<string>
}

/**
 * Options for setting recovery method (canonical).
 */
export type SetRecoveryOptions = {
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
