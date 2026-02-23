/**
 * Solana-specific exports for @openfort/react/solana
 *
 * Import from '@openfort/react/solana' for Solana-only features.
 * Tree-shakeable: only imported Solana code will be bundled.
 *
 * @packageDocumentation
 */

export { useSolanaEmbeddedWallet } from './hooks/useSolanaEmbeddedWallet'
export type {
  // Wallet types
  ConnectedEmbeddedSolanaWallet,
  CreateSolanaWalletOptions,
  CreateSolanaWalletResult,
  // Provider types
  OpenfortEmbeddedSolanaWalletProvider,
  SetActiveSolanaWalletOptions,
  // Kit Signer types
  SignedSolanaTransaction,
  // Configuration
  SolanaCluster,
  SolanaClusterConfig,
  SolanaCommitment,
  SolanaConfig,
  SolanaSignAllTransactionsRequest,
  SolanaSignMessageRequest,
  SolanaSignTransactionRequest,
  // Transaction types
  SolanaTransaction,
  SolanaWalletActions,
  SolanaWalletState,
  UseEmbeddedSolanaWalletOptions,
} from './types'
