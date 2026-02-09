/**
 * Ethereum Hook Utilities
 *
 * Shared utilities for Ethereum wallet hooks.
 */

import { RecoveryMethod, type RecoveryParams } from '@openfort/openfort-js'
import type { OpenfortWalletConfig } from '../../components/Openfort/types'
import { OpenfortError, OpenfortReactErrorType } from '../../types'

/**
 * Recovery options for Ethereum wallet operations
 */
export type EthereumRecoveryOptions = {
  /** Recovery method to use */
  recoveryMethod?: RecoveryMethod
  /** Passkey ID for PASSKEY recovery */
  passkeyId?: string
  /** Password for PASSWORD recovery */
  password?: string
  /** OTP code for automatic recovery */
  otpCode?: string
}

/**
 * Build recovery params from recovery options
 *
 * @param options - Recovery options
 * @param config - Build configuration
 * @returns Recovery params for Openfort SDK
 */
export async function buildRecoveryParams(
  options: EthereumRecoveryOptions | undefined,
  config: {
    walletConfig: OpenfortWalletConfig | undefined
    getAccessToken: () => Promise<string | null>
    getUserId: () => Promise<string | undefined>
  }
): Promise<RecoveryParams> {
  const { walletConfig, getAccessToken, getUserId } = config
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
        throw new OpenfortError('Password is required', OpenfortReactErrorType.UNEXPECTED_ERROR)
      }
      return {
        recoveryMethod: RecoveryMethod.PASSWORD,
        password: options.password,
      }
    }

    case RecoveryMethod.PASSKEY:
      return {
        recoveryMethod: RecoveryMethod.PASSKEY,
        ...(options?.passkeyId && { passkeyId: options.passkeyId }),
      } as RecoveryParams

    default:
      throw new OpenfortError(`Unsupported recovery method: ${recoveryMethod}`, OpenfortReactErrorType.UNEXPECTED_ERROR)
  }
}

/**
 * Get encryption session for automatic recovery
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
        throw new OpenfortError('OTP_REQUIRED', OpenfortReactErrorType.UNEXPECTED_ERROR)
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

/**
 * Format wei to ETH
 */
export function weiToEth(wei: bigint): number {
  return Number(wei) / 1e18
}

/**
 * Format ETH to wei
 */
export function ethToWei(eth: number): bigint {
  return BigInt(Math.floor(eth * 1e18))
}

/**
 * WEI_PER_ETH constant (1 ETH = 10^18 wei)
 */
export const WEI_PER_ETH = BigInt('1000000000000000000')

/**
 * GWEI_PER_ETH constant (1 ETH = 10^9 gwei)
 */
export const GWEI_PER_ETH = BigInt(1_000_000_000)
