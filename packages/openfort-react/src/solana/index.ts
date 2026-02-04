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
// Hooks (to be implemented in Phase 5)
// =============================================================================

// TODO: Phase 5 - Implement useSolanaEmbeddedWallet
// export { useSolanaEmbeddedWallet } from './hooks/useSolanaEmbeddedWallet'

// TODO: Phase 5 - Implement useSolanaSigner and useSolanaMessageSigner
// export { useSolanaSigner, useSolanaMessageSigner } from './hooks/useSolanaSigner'

// Note: useSolanaBalance is intentionally NOT exported (internal only for UI)
