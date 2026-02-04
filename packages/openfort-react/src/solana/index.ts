/**
 * Solana-specific exports for @openfort/react/solana
 *
 * Import from '@openfort/react/solana' for Solana-only features.
 * Tree-shakeable: only imported Solana code will be bundled.
 *
 * @example Basic usage
 * ```tsx
 * import { useSolanaEmbeddedWallet } from '@openfort/react/solana';
 *
 * function MyComponent() {
 *   const solana = useSolanaEmbeddedWallet();
 *
 *   if (solana.status === 'connected') {
 *     console.log('Address:', solana.activeWallet.address);
 *   }
 * }
 * ```
 *
 * @example With Kit Signer
 * ```tsx
 * import { useSolanaEmbeddedWallet, useSolanaSigner } from '@openfort/react/solana';
 *
 * function MyComponent() {
 *   const solana = useSolanaEmbeddedWallet();
 *   const signer = useSolanaSigner();
 *
 *   // Use signer with @solana/kit transactions
 *   if (signer) {
 *     // TransactionPartialSigner compatible
 *   }
 * }
 * ```
 *
 * @packageDocumentation
 */

// =============================================================================
// Types
// =============================================================================

export type {
  // Wallet types
  ConnectedEmbeddedSolanaWallet,
  CreateSolanaWalletOptions,
  CreateSolanaWalletResult,
  EmbeddedSolanaWalletState,
  // Provider types
  OpenfortEmbeddedSolanaWalletProvider,
  SetActiveSolanaWalletOptions,
  SetRecoveryOptions,
  // Kit Signer types
  SignatureDictionary,
  SignedSolanaTransaction,
  SolanaAddress,
  // Configuration
  SolanaCluster,
  SolanaCommitment,
  SolanaConfig,
  SolanaProviderRequest,
  SolanaSignAllTransactionsRequest,
  SolanaSignMessageRequest,
  SolanaSignTransactionRequest,
  // Transaction types
  SolanaTransaction,
  SolanaWalletActions,
  UseEmbeddedSolanaWalletOptions,
} from './types'

// =============================================================================
// Providers
// =============================================================================

export type { SolanaContextProviderProps, SolanaContextValue } from './providers/SolanaContextProvider'
export { SolanaContextProvider, useSolanaContext, useSolanaContextSafe } from './providers/SolanaContextProvider'

// =============================================================================
// Wallet Provider
// =============================================================================

export type { OpenfortSolanaProviderConfig } from './provider'
export { createSolanaProvider, OpenfortSolanaProvider } from './provider'

// =============================================================================
// Kit Signers
// =============================================================================

export type {
  Address,
  MessagePartialSigner,
  SignableMessage,
  SignableTransaction,
  TransactionMessageBytes,
  TransactionPartialSigner,
  TransactionPartialSignerConfig,
  TransactionWithLifetime,
} from './signers/OpenfortSolanaSigner'
export {
  createMessageSigner,
  createTransactionSigner,
  OpenfortMessagePartialSigner,
  OpenfortTransactionPartialSigner,
} from './signers/OpenfortSolanaSigner'

// =============================================================================
// Hooks
// =============================================================================

export { useSolanaEmbeddedWallet } from './hooks/useSolanaEmbeddedWallet'
export { useSolanaMessageSigner, useSolanaSigner } from './hooks/useSolanaSigner'

// Note: useSolanaBalance is intentionally NOT exported (internal only for UI)
