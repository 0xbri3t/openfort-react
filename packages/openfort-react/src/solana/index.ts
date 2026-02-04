/**
 * Solana-specific exports for @openfort/react/solana
 *
 * Import from '@openfort/react/solana' for Solana-only features.
 * Tree-shakeable: only imported Solana code will be bundled.
 *
 * @example Basic usage
 * ```tsx
 * import { useSolanaWallet } from '@openfort/react/solana';
 *
 * function MyComponent() {
 *   const solana = useSolanaWallet();
 *
 *   if (solana.status === 'connected') {
 *     console.log('Address:', solana.activeWallet.address);
 *   }
 * }
 * ```
 *
 * @example With Kit Signer
 * ```tsx
 * import { useSolanaWallet, useSolanaSigner } from '@openfort/react/solana';
 *
 * function MyComponent() {
 *   const solana = useSolanaWallet();
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
// Providers
// =============================================================================

// =============================================================================
// Hooks
// =============================================================================

export { useSolanaMessageSigner, useSolanaSigner } from './hooks/useSolanaSigner'
export { useSolanaWallet } from './hooks/useSolanaWallet'

export type { SolanaContextProviderProps, SolanaContextValue } from './providers/SolanaContextProvider'
export { SolanaContextProvider, useSolanaContext, useSolanaContextSafe } from './providers/SolanaContextProvider'
// Other hooks

// Note: useSolanaBalance is intentionally NOT exported (internal only for UI)

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
// Operations (pure functions for signing)
// =============================================================================

export {
  getTransactionBytes,
  type SignAllTransactionsParams,
  type SignMessageParams,
  type SignTransactionParams,
  signAllTransactions,
  signMessage,
  signTransaction,
} from './operations'

// =============================================================================
// Utils
// =============================================================================

export { LAMPORTS_PER_SOL, lamportsToSol, solToLamports } from './hooks/utils'
