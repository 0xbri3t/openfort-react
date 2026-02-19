import type { AccountTypeEnum } from '@openfort/openfort-js'
import type { Hex } from 'viem'
import type { OpenfortWalletConfig } from '../components/Openfort/types'
import { OpenfortError, OpenfortErrorCode } from '../core/errors'
import type { SolanaConfig } from '../solana/types'

type PolicyConfig = string | Record<number, string>

/**
 * Options for creating an Openfort wallet config.
 * Use this instead of manually building the nested walletConfig object.
 * Supports single-chain (ethereum or solana) and dual-chain (both).
 *
 * @example Single-chain EVM
 * ```ts
 * const walletConfig = createWalletConfig({
 *   shieldPublishableKey: 'shield_pk_...',
 *   ethereum: { chainId: 1, rpcUrls: { 1: 'https://eth.llamarpc.com' } },
 *   createEncryptedSessionEndpoint: '/api/create-session',
 * })
 * ```
 *
 * @example Single-chain Solana
 * ```ts
 * const walletConfig = createWalletConfig({
 *   shieldPublishableKey: 'shield_pk_...',
 *   solana: { cluster: 'mainnet-beta' },
 * })
 * ```
 *
 * @example Dual-chain (EVM + Solana)
 * ```ts
 * const walletConfig = createWalletConfig({
 *   shieldPublishableKey: 'shield_pk_...',
 *   ethereum: { chainId: 1, rpcUrls: { 1: 'https://eth.llamarpc.com' } },
 *   solana: { cluster: 'devnet' },
 * })
 * ```
 */
export type CreateWalletConfigOptions = {
  /** Required. Publishable key for the Shield API. */
  shieldPublishableKey: string

  /** Ethereum config. Provide with solana for dual-chain. */
  ethereum?: { chainId: number; rpcUrls?: Record<number, string> }
  /** Solana config. Provide with ethereum for dual-chain. */
  solana?: SolanaConfig

  // --- Encryption session (choose ONE; required for automatic recovery) ---
  /**
   * API endpoint that creates an encrypted session.
   * POST with body `{ user_id, otp_code? }`. Returns `{ session: string }`.
   * Mutually exclusive with getEncryptionSession.
   */
  createEncryptedSessionEndpoint?: string
  /**
   * Callback to retrieve an encryption session.
   * Mutually exclusive with createEncryptedSessionEndpoint.
   */
  getEncryptionSession?: (params: { accessToken: string; userId: string; otpCode?: string }) => Promise<string>

  // --- Recovery OTP (choose ONE; optional) ---
  /**
   * API endpoint for requesting wallet recovery OTP.
   * Mutually exclusive with requestWalletRecoverOTP.
   */
  requestWalletRecoverOTPEndpoint?: string
  /**
   * Callback to request wallet recovery OTP.
   * Mutually exclusive with requestWalletRecoverOTPEndpoint.
   */
  requestWalletRecoverOTP?: (params: {
    accessToken: string
    userId: string
    email?: string
    phone?: string
  }) => Promise<void>

  // --- Optional ---
  /** Display name shown in the passkey creation dialog. */
  passkeyDisplayName?: string
  /** Policy ID for the embedded signer. */
  ethereumProviderPolicyId?: PolicyConfig
  /** Account type. */
  accountType?: AccountTypeEnum
  /** Recover wallet automatically after auth. */
  recoverWalletAutomaticallyAfterAuth?: boolean
  /** Assets per chain ID. */
  assets?: { [chainId: number]: Hex[] }
}

/**
 * Creates a validated OpenfortWalletConfig for use with OpenfortProvider.
 * Validates mutually exclusive options and required fields.
 *
 * @param options - Configuration options (see CreateWalletConfigOptions)
 * @returns OpenfortWalletConfig ready to pass to OpenfortProvider
 * @throws OpenfortError if config is invalid
 */
export function createWalletConfig(options: CreateWalletConfigOptions): OpenfortWalletConfig {
  const {
    shieldPublishableKey,
    passkeyDisplayName,
    createEncryptedSessionEndpoint,
    getEncryptionSession,
    requestWalletRecoverOTPEndpoint,
    requestWalletRecoverOTP,
    ethereumProviderPolicyId,
    accountType,
    recoverWalletAutomaticallyAfterAuth,
    assets,
  } = options

  if (!shieldPublishableKey?.trim()) {
    throw new OpenfortError('shieldPublishableKey is required', OpenfortErrorCode.INVALID_CONFIG)
  }

  const resolvedEthereum = options.ethereum
  const resolvedSolana = options.solana

  if (!resolvedEthereum && !resolvedSolana) {
    throw new OpenfortError(
      'Provide ethereum and/or solana config. Example: ethereum: { chainId: 1 }, solana: { cluster: "devnet" }.',
      OpenfortErrorCode.INVALID_CONFIG
    )
  }

  const hasEndpoint = !!createEncryptedSessionEndpoint
  const hasCallback = !!getEncryptionSession
  if (hasEndpoint && hasCallback) {
    throw new OpenfortError(
      'Provide either createEncryptedSessionEndpoint or getEncryptionSession, not both.',
      OpenfortErrorCode.INVALID_CONFIG
    )
  }

  const hasOtpEndpoint = !!requestWalletRecoverOTPEndpoint
  const hasOtpCallback = !!requestWalletRecoverOTP
  if (hasOtpEndpoint && hasOtpCallback) {
    throw new OpenfortError(
      'Provide either requestWalletRecoverOTPEndpoint or requestWalletRecoverOTP, not both.',
      OpenfortErrorCode.INVALID_CONFIG
    )
  }

  const base = {
    shieldPublishableKey: shieldPublishableKey.trim(),
    ...(passkeyDisplayName != null && { passkeyDisplayName }),
    ...(ethereumProviderPolicyId != null && { ethereumProviderPolicyId }),
    ...(accountType != null && { accountType }),
    ...(recoverWalletAutomaticallyAfterAuth != null && { recoverWalletAutomaticallyAfterAuth }),
    ...(assets != null && Object.keys(assets).length > 0 && { assets }),
  }

  const encryptionSession = hasCallback
    ? { getEncryptionSession }
    : createEncryptedSessionEndpoint
      ? { createEncryptedSessionEndpoint }
      : {}

  const recoverOtp = hasOtpCallback
    ? { requestWalletRecoverOTP }
    : requestWalletRecoverOTPEndpoint
      ? { requestWalletRecoverOTPEndpoint }
      : {}

  return {
    ...base,
    ...encryptionSession,
    ...recoverOtp,
    ...(resolvedEthereum && {
      ethereum: { chainId: resolvedEthereum.chainId, rpcUrls: resolvedEthereum.rpcUrls },
    }),
    ...(resolvedSolana && { solana: resolvedSolana }),
  } as OpenfortWalletConfig
}
