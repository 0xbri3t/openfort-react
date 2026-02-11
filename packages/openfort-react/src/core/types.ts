/**
 * Core types for @openfort/react
 *
 * These types define the provider configuration and shared interfaces
 * for the wagmi-free architecture.
 */

import type { Openfort, OpenfortSDKConfiguration } from '@openfort/openfort-js'

import type { SolanaConfig } from '../solana/types'

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
  rpcUrls?: {
    ethereum?: Record<number, string>
    solana?: Partial<Record<'mainnet-beta' | 'devnet' | 'testnet', string>>
  }

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

export type { OpenfortHookOptions } from '../types'
export { OpenfortError, OpenfortReactErrorType } from '../types'
