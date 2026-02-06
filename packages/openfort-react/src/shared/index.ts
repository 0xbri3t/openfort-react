/**
 * Shared exports for @openfort/react
 *
 * Internal utilities shared between Ethereum and Solana implementations.
 * Most users should not need to import from this module directly.
 *
 * @internal
 * @packageDocumentation
 */

export { useAvailableChains } from './hooks/useAvailableChains'
export type {
  AvailableChainsResult,
  BaseCreateWalletOptions,
  BaseSetActiveWalletOptions,
  BaseSetRecoveryOptions,
  BaseWalletActions,
  ChainMode,
  WalletStatus,
} from './types'
