/**
 * Shared Recovery Utilities
 *
 * Recovery parameter building for both Ethereum and Solana wallets.
 * Reads encryption session config from walletConfig (via context).
 */

import { RecoveryMethod, type RecoveryParams } from '@openfort/openfort-js'

import type { OpenfortWalletConfig } from '../../components/Openfort/types'
import { OpenfortError, OpenfortReactErrorType } from '../../types'

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
        throw new OpenfortError('Access token not found', OpenfortReactErrorType.AUTHENTICATION_ERROR)
      }

      const userId = await getUserId()
      if (!userId) {
        throw new OpenfortError('User not found', OpenfortReactErrorType.AUTHENTICATION_ERROR)
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
        throw new OpenfortError(
          'Password is required for PASSWORD recovery',
          OpenfortReactErrorType.CONFIGURATION_ERROR
        )
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
      throw new OpenfortError(
        `Unsupported recovery method: ${recoveryMethod}`,
        OpenfortReactErrorType.CONFIGURATION_ERROR
      )
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
    throw new OpenfortError('Wallet config not found', OpenfortReactErrorType.CONFIGURATION_ERROR)
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
        throw new OpenfortError('OTP_REQUIRED', OpenfortReactErrorType.AUTHENTICATION_ERROR)
      }
      throw new OpenfortError('Failed to create encryption session', OpenfortReactErrorType.WALLET_ERROR)
    }

    return data.session
  }

  throw new OpenfortError(
    'No encryption session method configured. Provide getEncryptionSession or createEncryptedSessionEndpoint in walletConfig.',
    OpenfortReactErrorType.CONFIGURATION_ERROR
  )
}
