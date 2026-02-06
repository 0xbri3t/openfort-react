/**
 * Core module exports
 *
 * Foundation layer for @openfort/react
 * This module provides the wagmi-free base architecture.
 */

export {
  type AuthContextValue,
  AuthProvider,
  type AuthProviderProps,
  authQueryKeys,
  useAuthContext,
} from './AuthContext'
export { CoreProvider, type CoreProviderProps, useCoreContext, useHasCoreProvider } from './CoreContext'
export type { OpenfortErrorCode as OpenfortErrorCodeType } from './errors'
export {
  AuthenticationError,
  ConfigurationError,
  hasErrorCode,
  invariant,
  isOpenfortError,
  OpenfortErrorCode,
  OpenfortReactError,
  ProviderNotFoundError,
  WalletError,
} from './errors'
export { type UseAuthReturn, useAuth } from './hooks/useAuth'
export { type UseEmbeddedAccountsReturn, useEmbeddedAccounts } from './hooks/useEmbeddedAccounts'
export { type UseOpenfortClientReturn, useOpenfortClient } from './hooks/useOpenfortClient'
export type {
  AsyncState,
  AsyncStatus,
  CoreContextValue,
  CoreProviderConfig,
  EthereumRpcConfig,
  OnAuthError,
  OnAuthSuccess,
  OnWalletEvent,
  OpenfortConfig,
  RpcConfig,
  SolanaRpcConfig,
} from './types'

// Re-export existing types for backwards compatibility
export { OpenfortError, OpenfortReactErrorType } from './types'
