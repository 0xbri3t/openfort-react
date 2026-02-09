/**
 * Core types for @openfort/react
 *
 * These types define the provider configuration and shared interfaces
 * for the wagmi-free architecture.
 */

import type { EmbeddedAccount, EmbeddedState, Openfort, OpenfortSDKConfiguration, User } from '@openfort/openfort-js'

import type { SolanaConfig } from '../solana/types'

/**
 * RPC URL configuration for Ethereum chains
 * Maps chainId to RPC URL
 *
 * @example
 * ```ts
 * const rpcUrls: EthereumRpcConfig = {
 *   1: 'https://eth-mainnet.g.alchemy.com/v2/...',
 *   137: 'https://polygon-mainnet.g.alchemy.com/v2/...',
 * }
 * ```
 */
export type EthereumRpcConfig = Record<number, string>

/**
 * RPC URL configuration for Solana clusters
 * Maps cluster name to RPC URL
 *
 * @example
 * ```ts
 * const rpcUrls: SolanaRpcConfig = {
 *   'mainnet-beta': 'https://api.mainnet-beta.solana.com',
 *   'devnet': 'https://api.devnet.solana.com',
 * }
 * ```
 */
export type SolanaRpcConfig = Partial<Record<'mainnet-beta' | 'devnet' | 'testnet', string>>

/**
 * Combined RPC configuration
 */
export type RpcConfig = {
  ethereum?: EthereumRpcConfig
  solana?: SolanaRpcConfig
}

/**
 * Core provider configuration
 *
 * This is the simplified configuration for the new wagmi-free architecture.
 */
export type CoreProviderConfig = {
  /** Openfort publishable key (pk_...) */
  publishableKey: string

  /** Shield publishable key for embedded wallet security */
  shieldPublishableKey?: string

  /**
   * Custom RPC URLs (optional)
   * If not provided, Openfort uses default public RPCs
   */
  rpcUrls?: RpcConfig

  /**
   * Solana configuration
   * If provided, enables Solana support
   */
  solana?: SolanaConfig

  /**
   * Policy ID for gas sponsorship (Ethereum)
   * Can be a single policy or per-chain mapping
   */
  ethereumPolicyId?: string | Record<number, string>

  /**
   * Debug mode for development
   */
  debug?: boolean
}

/**
 * Full Openfort SDK configuration
 * Merges user config with SDK defaults
 */
export type OpenfortConfig = CoreProviderConfig & {
  /** Internal: Full SDK configuration */
  _sdkConfig: OpenfortSDKConfiguration
}

/**
 * Core context value
 * Provides access to the Openfort client and configuration
 */
export type CoreContextValue = {
  /** Openfort SDK client instance */
  client: Openfort

  /** Provider configuration */
  config: OpenfortConfig

  /** Whether debug mode is enabled */
  debug: boolean
}

/**
 * Wallet readiness for onboarding flows.
 * Use with useOpenfort() to decide: create wallet vs recovery form vs dashboard.
 */
export type WalletReadiness = 'not-created' | 'needs-recovery' | 'ready' | 'loading'

/**
 * Standard async operation status
 */
export type AsyncStatus = 'idle' | 'loading' | 'success' | 'error'

/**
 * Base async state for hooks
 */
export type AsyncState<T> = {
  data: T | undefined
  status: AsyncStatus
  error: Error | null
  isLoading: boolean
  isError: boolean
  isSuccess: boolean
  isIdle: boolean
}

/**
 * Auth context value (mapped from CoreOpenfortProvider).
 * Shape of auth-related values from the core context (useOpenfort / useOpenfortCore).
 */
export type AuthContextValue = {
  user: User | null
  isAuthenticated: boolean
  embeddedState: EmbeddedState
  embeddedAccounts: EmbeddedAccount[] | undefined
  isLoadingAccounts: boolean
  refetchAccounts: (options?: { silent?: boolean }) => Promise<void>
  logout: () => Promise<void>
  updateUser: (user?: User) => Promise<User | null>
  needsRecovery: boolean
}

/**
 * Callback for successful authentication
 */
export type OnAuthSuccess = (user: User) => void

/**
 * Callback for authentication errors
 */
export type OnAuthError = (error: Error) => void

/**
 * Callback for wallet operations
 */
export type OnWalletEvent = (account: EmbeddedAccount) => void

export type { OpenfortHookOptions } from '../types'
export { OpenfortError, OpenfortReactErrorType } from '../types'
