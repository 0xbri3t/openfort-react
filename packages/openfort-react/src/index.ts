/**
 * @packageDocumentation
 *
 * ## Which hook should I use?
 *
 * | Need | Use |
 * |------|-----|
 * | Auth user (isAuthenticated, user, linkedAccounts) | `useUser()` |
 * | Wallet state (chain-agnostic, any chain) | `useConnectedWallet()` |
 * | EVM-typed address/chainId | `useEthereumAccount()` |
 * | Solana address/cluster | `useSolanaAccount()` |
 */
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
export { default as Avatar } from './components/Common/Avatar'
export { default as ChainIcon } from './components/Common/Chain'
export { OpenfortButton } from './components/ConnectButton'
export { OpenfortProvider } from './components/Openfort/OpenfortProvider'
export { LinkWalletOnSignUpOption, UIAuthProvider as AuthProvider } from './components/Openfort/types'
export { PageLayout, type PageLayoutProps } from './components/PageLayout'
export { embeddedWalletId } from './constants/openfort'
// Ethereum
export { useEthereumEmbeddedWallet } from './ethereum/hooks/useEthereumEmbeddedWallet'
export {
  type OpenfortEthereumBridgeAccount,
  type OpenfortEthereumBridgeChain,
  type OpenfortEthereumBridgeConfig,
  type OpenfortEthereumBridgeConnector,
  OpenfortEthereumBridgeContext,
  type OpenfortEthereumBridgeSwitchChain,
  type OpenfortEthereumBridgeValue,
  useEthereumBridge,
} from './ethereum/OpenfortEthereumBridgeContext'
export type { ConnectedEmbeddedEthereumWallet } from './ethereum/types'
// ── Auth ──
export { useAuthCallback } from './hooks/openfort/auth/useAuthCallback'
export { useEmailAuth } from './hooks/openfort/auth/useEmailAuth'
export { useEmailOtpAuth } from './hooks/openfort/auth/useEmailOtpAuth'
export { useGuestAuth } from './hooks/openfort/auth/useGuestAuth'
export { useOAuth } from './hooks/openfort/auth/useOAuth'
export { usePhoneOtpAuth } from './hooks/openfort/auth/usePhoneOtpAuth'
export { useSignOut } from './hooks/openfort/auth/useSignOut'
/** @deprecated Use @openfort/wagmi for wagmi integration. Prefer useConnectWithSiwe or ConnectModal. */
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
  type EthereumUserWallet,
  type SolanaUserWallet,
  type UserWallet,
  useWallets,
} from './hooks/openfort/useWallets'
/** @deprecated Use @openfort/wagmi for wagmi integration. For EVM-only (no wagmi), use `useEthereumBalance`. */
export { type UseAccountBalanceReturnType, useAccountBalance } from './hooks/useAccountBalance'
export { useChainIsSupported } from './hooks/useChainIsSupported'
export { useChains } from './hooks/useChains'
export {
  type ConnectedWalletState,
  type ConnectedWalletStatus,
  useConnectedWallet,
  type WalletType,
} from './hooks/useConnectedWallet'
/** @deprecated Use @openfort/wagmi for wagmi integration. For EVM-only (no wagmi), use `useEthereumDisconnect`. */
export { type UseDisconnectReturnType, useDisconnect } from './hooks/useDisconnect'
export type { EmbeddedWalletState } from './hooks/useEmbeddedWallet'
export { useEmbeddedWallet } from './hooks/useEmbeddedWallet'
/** @deprecated Use @openfort/wagmi for wagmi integration. For EVM-only (no wagmi), use `useEthereumSwitchChain`. */
export { type UseSwitchChainReturnType, useSwitchChain } from './hooks/useSwitchChain'
export { useOpenfortCore as useOpenfort } from './openfort/useOpenfort'
export { useChain } from './shared/hooks/useChain'
export type { TransactionFlowStatus, UseTransactionFlowResult } from './shared/hooks/useTransactionFlow'
export { useTransactionFlow } from './shared/hooks/useTransactionFlow'
export { type ExplorerUrlOptions, getExplorerUrl } from './shared/utils/explorer'
export { isValidEvmAddress, isValidSolanaAddress } from './shared/utils/validation'
export { createSIWEMessage } from './siwe/create-siwe-message'
// Solana
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
export { useConnectUI } from './ui/ConnectUIContext'
export {
  formatAddress,
  formatBalance,
  formatEther,
  formatEVMAddress,
  formatSol,
  formatSolanaAddress,
  truncateEthAddress,
  truncateSolanaAddress,
} from './utils/format'
export { OPENFORT_VERSION } from './version'
// ── Wallet Adapters (chain-specific) ──
export {
  useEthereumAccount,
  useEthereumBalance,
  useEthereumDisconnect,
  useEthereumReadContract,
  useEthereumSignMessage,
  useEthereumSwitchChain,
  useEthereumWriteContract,
  useSolanaAccount,
  useSolanaBalance,
  useSolanaDisconnect,
  useSolanaSignMessage,
  useSolanaWriteContract,
} from './wallet-adapters'

import type { CountryData, CountryIso2, CountrySelectorProps } from 'react-international-phone'
export type { CountryData, CountryIso2, CountrySelectorProps }
