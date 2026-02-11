/**
 * Shared exports for @openfort/react
 *
 * Internal utilities shared between Ethereum and Solana implementations.
 * Most users should not need to import from this module directly.
 *
 * @internal
 * @packageDocumentation
 */

export type { OTPResponse } from './hooks/useRecoveryOTP'
export { useRecoveryOTP } from './hooks/useRecoveryOTP'
export type {
  BaseCreateWalletOptions,
  BaseSetActiveWalletOptions,
  BaseWalletActions,
  RecoverableWallet,
  SetRecoveryOptions,
  WalletStatus,
} from './types'
