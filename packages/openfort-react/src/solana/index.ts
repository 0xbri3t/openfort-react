/**
 * Solana-specific exports for @openfort/react/solana
 *
 * Import from '@openfort/react/solana' for Solana-only features.
 * Tree-shakeable: only imported Solana code will be bundled.
 *
 * @packageDocumentation
 */

export type { SetRecoveryOptions } from '../shared/types'
export { useSolanaEmbeddedWallet } from './hooks/useSolanaEmbeddedWallet'
export type { SolanaSendTransactionStatus, UseSolanaSendTransactionResult } from './hooks/useSolanaSendTransaction'
export { useSolanaSendTransaction } from './hooks/useSolanaSendTransaction'
export { useSolanaMessageSigner, useSolanaSigner } from './hooks/useSolanaSigner'
export { LAMPORTS_PER_SOL, lamportsToSol, solToLamports } from './hooks/utils'
export {
  getTransactionBytes,
  type SignAllTransactionsParams,
  type SignMessageParams,
  type SignTransactionParams,
  signAllTransactions,
  signMessage,
  signTransaction,
} from './operations'
export type { OpenfortSolanaProviderConfig } from './provider'
export { createSolanaProvider, OpenfortSolanaProvider } from './provider'
export type { SolanaContextProviderProps, SolanaContextValue } from './SolanaContext'
export { SolanaContextProvider, useSolanaContext } from './SolanaContext'
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
export type {
  // Wallet types
  ConnectedEmbeddedSolanaWallet,
  CreateSolanaWalletOptions,
  CreateSolanaWalletResult,
  EmbeddedSolanaWalletState,
  // Provider types
  OpenfortEmbeddedSolanaWalletProvider,
  SetActiveSolanaWalletOptions,
  // Kit Signer types
  SignatureDictionary,
  SignedSolanaTransaction,
  SolanaAddress,
  // Configuration
  SolanaCluster,
  SolanaClusterConfig,
  SolanaCommitment,
  SolanaConfig,
  SolanaProviderRequest,
  SolanaSignAllTransactionsRequest,
  SolanaSignMessageRequest,
  SolanaSignTransactionRequest,
  // Transaction types
  SolanaTransaction,
  SolanaUIOptions,
  SolanaWalletActions,
  UseEmbeddedSolanaWalletOptions,
} from './types'
