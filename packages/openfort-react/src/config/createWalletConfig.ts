import type { AccountTypeEnum } from '@openfort/openfort-js'
import type { Hex } from 'viem'
import type { OpenfortWalletConfig } from '../components/Openfort/types'
import { OpenfortError, OpenfortErrorCode } from '../core/errors'
import type { SolanaConfig } from '../solana/types'

type PolicyConfig = string | Record<number, string>

/**
 * Options for creating an Openfort wallet config.
 * Use this instead of manually building the nested walletConfig object.
 *
 * @example
 * ```ts
 * const walletConfig = createWalletConfig({
 *   shieldPublishableKey: 'shield_pk_...',
 *   chain: 'ethereum',
 *   chainId: 1,
 *   createEncryptedSessionEndpoint: '/api/create-session',
 *   requestWalletRecoverOTPEndpoint: '/api/recover-otp',
 * })
 * ```
 *
 * @example With getEncryptionSession (mutually exclusive with createEncryptedSessionEndpoint)
 * ```ts
 * const walletConfig = createWalletConfig({
 *   shieldPublishableKey: 'shield_pk_...',
 *   chain: 'ethereum',
 *   chainId: 1,
 *   getEncryptionSession: async ({ accessToken, userId, otpCode }) => {
 *     const res = await fetch('/api/session', {
 *       method: 'POST',
 *       body: JSON.stringify({ user_id: userId, otp_code: otpCode }),
 *       headers: { Authorization: `Bearer ${accessToken}` },
 *     })
 *     const { session } = await res.json()
 *     return session
 *   },
 * })
 * ```
 */
export type CreateWalletConfigOptions = {
  /** Required. Publishable key for the Shield API. */
  shieldPublishableKey: string

  /** Chain type. Use 'ethereum' for EVM or 'solana' for SVM. */
  chain: 'ethereum' | 'solana'

  // --- Ethereum (required when chain === 'ethereum') ---
  /** Ethereum chain ID (e.g. 1 for mainnet, 137 for Polygon). Required when chain is 'ethereum'. */
  chainId?: number
  /** Optional RPC URLs per chain ID. */
  rpcUrls?: Record<number, string>

  // --- Solana (required when chain === 'solana') ---
  /** Solana config. Required when chain is 'solana'. */
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
    chain,
    chainId,
    rpcUrls,
    solana,
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

  if (chain === 'ethereum') {
    if (chainId == null) {
      throw new OpenfortError(
        'chainId is required when chain is "ethereum". Example: chainId: 1 for mainnet.',
        OpenfortErrorCode.INVALID_CONFIG
      )
    }
  } else if (chain === 'solana') {
    if (!solana) {
      throw new OpenfortError(
        'solana config is required when chain is "solana". Example: solana: { cluster: "mainnet-beta" }.',
        OpenfortErrorCode.INVALID_CONFIG
      )
    }
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

  const base: OpenfortWalletConfig = {
    shieldPublishableKey: shieldPublishableKey.trim(),
    ...(ethereumProviderPolicyId != null && { ethereumProviderPolicyId }),
    ...(accountType != null && { accountType }),
    ...(recoverWalletAutomaticallyAfterAuth != null && { recoverWalletAutomaticallyAfterAuth }),
    ...(assets != null && Object.keys(assets).length > 0 && { assets }),
  }

  const encryptionSession = hasCallback
    ? { getEncryptionSession }
    : hasEndpoint
      ? { createEncryptedSessionEndpoint: createEncryptedSessionEndpoint! }
      : {}

  const recoverOtp = hasOtpCallback
    ? { requestWalletRecoverOTP }
    : hasOtpEndpoint
      ? { requestWalletRecoverOTPEndpoint: requestWalletRecoverOTPEndpoint! }
      : {}

  if (chain === 'ethereum') {
    return {
      ...base,
      ethereum: { chainId: chainId!, rpcUrls },
      ...encryptionSession,
      ...recoverOtp,
    } as OpenfortWalletConfig
  }

  return {
    ...base,
    solana: solana!,
    ...encryptionSession,
    ...recoverOtp,
  } as OpenfortWalletConfig
}
