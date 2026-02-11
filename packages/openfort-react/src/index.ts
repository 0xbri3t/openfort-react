export {
  AccountTypeEnum,
  AuthInitPayload,
  AuthResponse,
  ChainTypeEnum,
  EmbeddedAccount,
  OpenfortEventMap,
  OpenfortEvents,
  openfortEvents,
  RecoveryMethod,
  RecoveryParams,
  SignedMessagePayload,
  User,
} from '@openfort/openfort-js'
// Compat layer (deprecated hooks)
export { useOpenfortCore } from './compat/useOpenfortCore'
export { default as Avatar } from './components/Common/Avatar'
export { default as ChainIcon } from './components/Common/Chain'
export { OpenfortButton } from './components/ConnectButton'
export { OpenfortProvider } from './components/Openfort/OpenfortProvider'
export { LinkWalletOnSignUpOption, UIAuthProvider as AuthProvider } from './components/Openfort/types'
export { PageLayout, type PageLayoutProps } from './components/PageLayout'
export { embeddedWalletId } from './constants/openfort'
export {
  type ConnectionStrategy,
  type ConnectionStrategyState,
  type ConnectRoute,
  DEFAULT_DEV_CHAIN_ID,
} from './core/ConnectionStrategy'
export { ConnectionStrategyProvider, useConnectionStrategy } from './core/ConnectionStrategyContext'
export { OpenfortTransactionError, TransactionErrorCode } from './core/errors'
export {
  type OpenfortEVMBridgeAccount,
  type OpenfortEVMBridgeChain,
  type OpenfortEVMBridgeConfig,
  type OpenfortEVMBridgeConnector,
  OpenfortEVMBridgeContext,
  type OpenfortEVMBridgeSwitchChain,
  type OpenfortEVMBridgeValue,
  useEVMBridge,
} from './core/OpenfortEVMBridgeContext'
export { queryKeys } from './core/queryKeys'
export { createEVMBridgeStrategy } from './core/strategies/EVMBridgeStrategy'
export { createEVMEmbeddedStrategy } from './core/strategies/EVMEmbeddedStrategy'
export type { WalletReadiness } from './core/types'
// Ethereum context types
export type { ChainId, SetChainResult } from './ethereum/EthereumContext'
// Convenience re-export for Ethereum hook (can also import from '@openfort/react/ethereum')
export { useEthereumEmbeddedWallet } from './ethereum/hooks/useEthereumEmbeddedWallet'
export type { ConnectedEmbeddedEthereumWallet } from './ethereum/types'
export { useAuthCallback } from './hooks/openfort/auth/useAuthCallback'
export { useEmailAuth } from './hooks/openfort/auth/useEmailAuth'
export { useEmailOtpAuth } from './hooks/openfort/auth/useEmailOtpAuth'
export { useGuestAuth } from './hooks/openfort/auth/useGuestAuth'
export { useOAuth } from './hooks/openfort/auth/useOAuth'
export { usePhoneOtpAuth } from './hooks/openfort/auth/usePhoneOtpAuth'
export { useSignOut } from './hooks/openfort/auth/useSignOut'
export { useWalletAuth } from './hooks/openfort/auth/useWalletAuth'
export {
  type SignAuthorizationParameters,
  type SignAuthorizationReturnType,
  use7702Authorization,
} from './hooks/openfort/use7702Authorization'
export { useConnectWithSiwe } from './hooks/openfort/useConnectWithSiwe'
export { useGrantPermissions } from './hooks/openfort/useGrantPermissions'
export { useRevokePermissions } from './hooks/openfort/useRevokePermissions'
export { useUI } from './hooks/openfort/useUI'
export { useUser } from './hooks/openfort/useUser'
export { useWalletAssets } from './hooks/openfort/useWalletAssets'
export {
  EthereumUserWallet,
  embeddedAccountToSolanaUserWallet,
  embeddedAccountToUserWallet,
  SolanaUserWallet,
  useWallets,
} from './hooks/openfort/useWallets'
export { type UseAccountReturnType, useAccount } from './hooks/useAccount'
export { type UseAccountBalanceReturnType, useAccountBalance } from './hooks/useAccountBalance'
export { useChainIsSupported } from './hooks/useChainIsSupported'
export { useChains } from './hooks/useChains'
export {
  type ConnectedWalletState,
  type ConnectedWalletStatus,
  useConnectedWallet,
} from './hooks/useConnectedWallet'
export { useConnectLifecycle } from './hooks/useConnectLifecycle'
export { useConnectRoutes } from './hooks/useConnectRoutes'
export { type UseDisconnectReturnType, useDisconnect } from './hooks/useDisconnect'
export type { EmbeddedWalletState } from './hooks/useEmbeddedWallet'
export { useEmbeddedWallet } from './hooks/useEmbeddedWallet'
export { type UseSwitchChainReturnType, useSwitchChain } from './hooks/useSwitchChain'
export { useOpenfortCore as useOpenfort } from './openfort/useOpenfort'
export { useChain } from './shared/hooks/useChain'
export type { TransactionFlowStatus, UseTransactionFlowResult } from './shared/hooks/useTransactionFlow'
export { useTransactionFlow } from './shared/hooks/useTransactionFlow'
export { type ExplorerUrlOptions, getExplorerUrl } from './shared/utils/explorer'
export { isValidEvmAddress, isValidSolanaAddress } from './shared/utils/validation'
// SIWE utilities for direct SDK usage (no wagmi required)
export { createSIWEMessage } from './siwe/create-siwe-message'
export { useSolanaBalance } from './solana/hooks/useSolanaBalance'
export { useSolanaEmbeddedWallet } from './solana/hooks/useSolanaEmbeddedWallet'
export type {
  SolanaSendTransactionStatus,
  UseSolanaSendTransactionResult,
} from './solana/hooks/useSolanaSendTransaction'
export { useSolanaSendTransaction } from './solana/hooks/useSolanaSendTransaction'
export { useSolanaMessageSigner, useSolanaSigner } from './solana/hooks/useSolanaSigner'
export type { SolanaConfig } from './solana/types'
export type { CustomTheme } from './styles/customTheme'
export type {
  CustomAvatarProps,
  CustomizableRoutes,
  Languages,
  Mode,
  OpenfortHookOptions,
  OpenfortOptions,
  OpenfortWalletConfig,
  PhoneConfig,
  Theme,
} from './types'
export {
  OAuthProvider,
  OpenfortError,
  OpenfortReactErrorType as OpenfortErrorType,
  SDKOverrides,
  ThirdPartyOAuthProvider,
} from './types'
// UI hooks (new clean API)
export { type ConnectUIValue, useConnectUI } from './ui/ConnectUIContext'
export {
  formatAddress,
  formatBalance,
  formatEther,
  formatEVMAddress,
  formatSol,
  formatSolanaAddress,
} from './utils/format'
export { OPENFORT_VERSION } from './version'
// Wallet adapters: interfaces + EVM/Solana implementations
export type {
  SolanaCluster,
  UseAccountLike,
  UseBalanceLike,
  UseDisconnectLike,
  UseReadContractLike,
  UseSignMessageLike,
  UseSolanaAccountLike,
  UseSolanaSendSOLLike,
  UseSolanaSignMessageLike,
  UseSolanaSwitchClusterLike,
  UseSwitchChainLike,
  UseWriteContractLike,
  WalletAdapterChain,
} from './wallet-adapters'
export {
  useEVMAccount,
  useEVMBalance,
  useEVMDisconnect,
  useEVMReadContract,
  useEVMSignMessage,
  useEVMSwitchChain,
  useEVMWriteContract,
  useSolanaAccount,
  useSolanaBalanceAdapter,
  useSolanaDisconnect,
  useSolanaSendSOL,
  useSolanaSignMessageAdapter,
  useSolanaSwitchCluster,
} from './wallet-adapters'
export { wallets } from './wallets'
export { useEVMConnectors, useWallet, type WalletProps } from './wallets/useEVMConnectors'

import type { CountryData, CountryIso2, CountrySelectorProps } from 'react-international-phone'
export type { CountryData, CountryIso2, CountrySelectorProps }
