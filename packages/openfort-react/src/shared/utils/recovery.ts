/**
 * Shared Recovery Utilities
 *
 * Recovery parameter building for both Ethereum and Solana wallets.
 * Reads encryption session config from walletConfig (via context).
 */

import { RecoveryMethod, type RecoveryParams } from '@openfort/openfort-js'

import type { OpenfortWalletConfig } from '../../components/Openfort/types'
import { OpenfortErrorCode, OpenfortReactError } from '../../core/errors'

/**
 * Recovery options for wallet operations
 */
export type RecoveryOptions = {
  /** Recovery method to use */
  recoveryMethod?: RecoveryMethod
  /** Password for PASSWORD recovery */
  password?: string
  /** OTP code for automatic recovery */
  otpCode?: string
}

/**
 * Context for building recovery params
 * Passed from hooks that have access to walletConfig and client
 */
export type RecoveryContext = {
  /** Wallet config from OpenfortProvider (contains encryption session settings) */
  walletConfig: OpenfortWalletConfig | undefined
  /** Function to get current access token */
  getAccessToken: () => Promise<string | null>
  /** Function to get current user ID */
  getUserId: () => Promise<string | undefined>
}

/**
 * Build recovery params from options
 *
 * @param options - Recovery options (password, otpCode, etc.)
 * @param context - Context with walletConfig and auth functions
 * @returns Recovery params for Openfort SDK
 */
export async function buildRecoveryParams(
  options: RecoveryOptions | undefined,
  context: RecoveryContext
): Promise<RecoveryParams> {
  const { walletConfig, getAccessToken, getUserId } = context
  const recoveryMethod = options?.recoveryMethod ?? RecoveryMethod.AUTOMATIC

  switch (recoveryMethod) {
    case RecoveryMethod.AUTOMATIC: {
      const accessToken = await getAccessToken()
      if (!accessToken) {
        throw new OpenfortReactError('Access token not found', OpenfortErrorCode.NOT_AUTHENTICATED)
      }

      const userId = await getUserId()
      if (!userId) {
        throw new OpenfortReactError('User not found', OpenfortErrorCode.NOT_AUTHENTICATED)
      }

      const encryptionSession = await getEncryptionSession({
        accessToken,
        userId,
        otpCode: options?.otpCode,
        walletConfig,
      })

      return {
        recoveryMethod: RecoveryMethod.AUTOMATIC,
        encryptionSession,
      }
    }

    case RecoveryMethod.PASSWORD: {
      if (!options?.password) {
        throw new OpenfortReactError('Password is required for PASSWORD recovery', OpenfortErrorCode.INVALID_CONFIG)
      }
      return {
        recoveryMethod: RecoveryMethod.PASSWORD,
        password: options.password,
      }
    }

    case RecoveryMethod.PASSKEY: {
      return {
        recoveryMethod: RecoveryMethod.PASSKEY,
      }
    }

    default:
      throw new OpenfortReactError(`Unsupported recovery method: ${recoveryMethod}`, OpenfortErrorCode.INVALID_CONFIG)
  }
}

/**
 * Get encryption session for automatic recovery
 * Uses walletConfig.getEncryptionSession or walletConfig.createEncryptedSessionEndpoint
 */
async function getEncryptionSession(params: {
  accessToken: string
  userId: string
  otpCode?: string
  walletConfig: OpenfortWalletConfig | undefined
}): Promise<string> {
  const { accessToken, userId, otpCode, walletConfig } = params

  if (!walletConfig) {
    throw new OpenfortReactError('Wallet config not found', OpenfortErrorCode.INVALID_CONFIG)
  }

  // Use custom function if provided
  if (walletConfig.getEncryptionSession) {
    return await walletConfig.getEncryptionSession({ accessToken, userId, otpCode })
  }

  // Use endpoint if provided
  if (walletConfig.createEncryptedSessionEndpoint) {
    const response = await fetch(walletConfig.createEncryptedSessionEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, otp_code: otpCode }),
    })

    const data = await response.json()
    if (!response.ok) {
      if (data.error === 'OTP_REQUIRED') {
        throw new OpenfortReactError('OTP_REQUIRED', OpenfortErrorCode.AUTH_FAILED)
      }
      throw new OpenfortReactError('Failed to create encryption session', OpenfortErrorCode.WALLET_CREATION_FAILED)
    }

    return data.session
  }

  throw new OpenfortReactError(
    'No encryption session method configured. Provide getEncryptionSession or createEncryptedSessionEndpoint in walletConfig.',
    OpenfortErrorCode.INVALID_CONFIG
  )
}
