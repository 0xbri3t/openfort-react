/**
 * @packageDocumentation
 *
 * ## SSR Compatibility
 *
 * **All hooks and interactive components are client-only.** They use React hooks and browser APIs
 * and must run in Client Components.
 *
 * - **Server Components (Next.js App Router, Remix):** Do not use hooks or `OpenfortProvider` in
 *   Server Components. Wrap your app (or the subtree that needs Openfort) in a Client Component.
 * - **Next.js App Router:** Add `"use client"` at the top of any file that imports hooks,
 *   `OpenfortProvider`, or `OpenfortButton`.
 * - **Hydration:** No hydration mismatches when used correctly. Keep the provider and any
 *   hook-using components on the client boundary.
 *
 * @example
 * ```tsx
 * // app/providers.tsx
 * "use client"
 * import { OpenfortProvider } from "@openfort/react"
 *
 * export function Providers({ children }) {
 *   return <OpenfortProvider publishableKey="pk_...">{children}</OpenfortProvider>
 * }
 * ```
 *
 * ## Which hook should I use?
 *
 * | Need | Use |
 * |------|-----|
 * | Auth user (isAuthenticated, user, linkedAccounts) | `useUser()` |
 * | Am I connected? (auth + wallet ready) | `useUser().isReady` |
 * | EVM wallet (address, chainId, status, create, export) | `useEthereumEmbeddedWallet()` |
 * | Solana wallet (address, cluster, status, create) | `useSolanaEmbeddedWallet()` |
 * | Chain-aware wallet delegator | `useEmbeddedWallet()` |
 * | Send SOL | `useSolanaSendTransaction()` |
 * | Solana kit signer | `useSolanaSigner()` / `useSolanaMessageSigner()` |
 * | EVM assets (ERC-7811) | `useEthereumWalletAssets()` (from `@openfort/react/ethereum`) |
 * | Send ETH / write contract / get balance (EVM) | Use `wagmi` or `viem` directly |
 * | Get SOL balance / sign message (Solana) | Use `@solana/kit` directly |
 * | Connect with SIWE + get bridge | `useConnectWithSiwe()` |
 * | Grant session key permissions | `useGrantPermissions()` |
 * | Revoke session key permissions | `useRevokePermissions()` |
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
export type { CreateWalletConfigOptions } from './config/createWalletConfig'
export { createWalletConfig } from './config/createWalletConfig'
export { embeddedWalletId } from './constants/openfort'
export { formatErrorWithReason, getErrorReason, OpenfortError, OpenfortErrorCode } from './core/errors'
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
} from './ethereum/OpenfortEthereumBridgeContext'
export type {
  ConnectedEmbeddedEthereumWallet,
  CreateEthereumWalletOptions,
  CreateEthereumWalletResult,
  EmbeddedEthereumWalletState,
  SetActiveEthereumWalletOptions,
  UseEmbeddedEthereumWalletOptions,
} from './ethereum/types'
// ── Auth ──
export { useAuthCallback } from './hooks/openfort/auth/useAuthCallback'
export type { EmailVerificationResult } from './hooks/openfort/auth/useEmailAuth'
export { useEmailAuth } from './hooks/openfort/auth/useEmailAuth'
export { useEmailOtpAuth } from './hooks/openfort/auth/useEmailOtpAuth'
export { useGuestAuth } from './hooks/openfort/auth/useGuestAuth'
export type { StoreCredentialsResult } from './hooks/openfort/auth/useOAuth'
export { useOAuth } from './hooks/openfort/auth/useOAuth'
export { usePhoneOtpAuth } from './hooks/openfort/auth/usePhoneOtpAuth'
export { useSignOut } from './hooks/openfort/auth/useSignOut'
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
export type {
  EthereumUserWallet,
  SolanaUserWallet,
  UserWallet,
} from './hooks/openfort/walletTypes'
export { useChainIsSupported } from './hooks/useChainIsSupported'
export { useChains } from './hooks/useChains'
export { useOpenfortCore as useOpenfort } from './openfort/useOpenfort'
export { useChain } from './shared/hooks/useChain'
export { isValidEvmAddress, isValidSolanaAddress } from './shared/utils/validation'
export { createSIWEMessage } from './siwe/create-siwe-message'
// Solana
export { useSolanaEmbeddedWallet } from './solana/hooks/useSolanaEmbeddedWallet'
export { useSolanaSigner } from './solana/hooks/useSolanaSigner'
export type {
  ConnectedEmbeddedSolanaWallet,
  CreateSolanaWalletOptions,
  EmbeddedSolanaWalletState,
  SetActiveSolanaWalletOptions,
  SolanaConfig,
  UseEmbeddedSolanaWalletOptions,
} from './solana/types'
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
  SDKOverrides,
  ThirdPartyOAuthProvider,
} from './types'
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
export {
  type ExternalConnectorProps,
  useExternalConnector,
  useExternalConnectors,
} from './wallets/useExternalConnectors'

import type { CountryData, CountryIso2, CountrySelectorProps } from 'react-international-phone'
export type { CountryData, CountryIso2, CountrySelectorProps }
