import { RecoveryMethod, type RecoveryParams } from '@openfort/openfort-js'
import type { OpenfortWalletConfig } from '../../components/Openfort/types'
import { OpenfortError, OpenfortErrorCode } from '../../core/errors'

export type RecoveryOptions = {
  recoveryMethod?: RecoveryMethod
  passkeyId?: string
  password?: string
  otpCode?: string
}

export type BuildRecoveryParamsConfig = {
  walletConfig: OpenfortWalletConfig | undefined
  getAccessToken: () => Promise<string | null>
  getUserId: () => Promise<string | undefined>
}

export async function buildRecoveryParams(
  options: RecoveryOptions | undefined,
  config: BuildRecoveryParamsConfig
): Promise<RecoveryParams> {
  const { walletConfig, getAccessToken, getUserId } = config
  const recoveryMethod = options?.recoveryMethod ?? RecoveryMethod.AUTOMATIC

  switch (recoveryMethod) {
    case RecoveryMethod.AUTOMATIC: {
      const accessToken = await getAccessToken()
      if (!accessToken) {
        throw new OpenfortError('Access token not found', OpenfortErrorCode.NOT_AUTHENTICATED)
      }

      const userId = await getUserId()
      if (!userId) {
        throw new OpenfortError('User not found', OpenfortErrorCode.NOT_AUTHENTICATED)
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
        throw new OpenfortError('Password is required', OpenfortErrorCode.UNKNOWN_ERROR)
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
      throw new OpenfortError('Unsupported recovery method', OpenfortErrorCode.UNKNOWN_ERROR, {
        cause: { recoveryMethod },
      })
  }
}

async function getEncryptionSession(params: {
  accessToken: string
  userId: string
  otpCode?: string
  walletConfig: OpenfortWalletConfig | undefined
}): Promise<string> {
  const { accessToken, userId, otpCode, walletConfig } = params

  if (!walletConfig) {
    throw new OpenfortError('Wallet config not found', OpenfortErrorCode.INVALID_CONFIG)
  }

  if (walletConfig.getEncryptionSession) {
    return await walletConfig.getEncryptionSession({ accessToken, userId, otpCode })
  }

  if (walletConfig.createEncryptedSessionEndpoint) {
    const response = await fetch(walletConfig.createEncryptedSessionEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, otp_code: otpCode }),
    })

    const data = await response.json()
    if (!response.ok) {
      if (data.error === 'OTP_REQUIRED') {
        throw new OpenfortError('OTP_REQUIRED', OpenfortErrorCode.UNKNOWN_ERROR)
      }
      throw new OpenfortError('Failed to create encryption session', OpenfortErrorCode.WALLET_CREATION_FAILED)
    }

    return data.session
  }

  throw new OpenfortError(
    'No encryption session method configured. Provide getEncryptionSession or createEncryptedSessionEndpoint in walletConfig.',
    OpenfortErrorCode.INVALID_CONFIG
  )
}
