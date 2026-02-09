/**
 * Core module exports
 *
 * Foundation layer for @openfort/react
 * This module provides the wagmi-free base architecture.
 */

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
export { type UseOpenfortClientReturn, useOpenfortClient } from './hooks/useOpenfortClient'
export { authQueryKeys } from './queryKeys'
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
