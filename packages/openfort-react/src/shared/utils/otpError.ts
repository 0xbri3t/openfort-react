import { OpenfortError, OpenfortErrorCode } from '../../core/errors'

export type HandleOtpErrorResult = {
  error: OpenfortError
  isOTPRequired: boolean
}

export function handleOtpRecoveryError(error: OpenfortError, hasWalletRecoveryOTP: boolean): HandleOtpErrorResult {
  if (error.message !== 'OTP_REQUIRED') {
    return { error, isOTPRequired: false }
  }

  const newError = hasWalletRecoveryOTP
    ? new OpenfortError('OTP code is required to recover the wallet.', OpenfortErrorCode.WALLET_RECOVERY_REQUIRED)
    : new OpenfortError(
        'OTP code is required to recover the wallet.\nPlease set requestWalletRecoveryOTP or requestWalletRecoveryOTPEndpoint in OpenfortProvider.',
        OpenfortErrorCode.WALLET_RECOVERY_REQUIRED
      )

  return { error: newError, isOTPRequired: true }
}
