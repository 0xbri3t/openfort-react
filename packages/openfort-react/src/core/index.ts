/**
 * Core module exports
 *
 * Foundation layer for @openfort/react
 * This module provides the wagmi-free base architecture.
 */

export {
  type ConnectionStrategy,
  type ConnectionStrategyState,
  type ConnectRoute,
  DEFAULT_DEV_CHAIN_ID,
  DEFAULT_TESTNET_CHAIN_ID,
} from './ConnectionStrategy'
export { ConnectionStrategyProvider, useConnectionStrategy } from './ConnectionStrategyContext'
export { CoreProvider, type CoreProviderProps, useCoreContext, useHasCoreProvider } from './CoreContext'
export {
  ConfigurationError,
  isOpenfortError,
  OpenfortErrorCode,
  OpenfortReactError,
  WalletError,
} from './errors'
export { type UseOpenfortClientReturn, useOpenfortClient } from './hooks/useOpenfortClient'
export {
  type OpenfortEVMBridgeAccount,
  type OpenfortEVMBridgeChain,
  type OpenfortEVMBridgeConfig,
  type OpenfortEVMBridgeConnector,
  OpenfortEVMBridgeContext,
  type OpenfortEVMBridgeStorage,
  type OpenfortEVMBridgeSwitchChain,
  type OpenfortEVMBridgeValue,
  useEVMBridge,
} from './OpenfortEVMBridgeContext'
export { createEVMBridgeStrategy } from './strategies/EVMBridgeStrategy'
export { createEVMEmbeddedStrategy } from './strategies/EVMEmbeddedStrategy'
export type {
  CoreContextValue,
  CoreProviderConfig,
  OpenfortConfig,
} from './types'

// Re-export existing types for backwards compatibility
export { OpenfortError, OpenfortReactErrorType } from './types'
