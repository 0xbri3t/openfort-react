/**
 * OTP error handling for wallet recovery
 */

import { OpenfortError, OpenfortReactErrorType } from '../../types'

export type HandleOtpErrorResult = {
  error: OpenfortError
  isOTPRequired: boolean
}

/**
 * Handle OTP_REQUIRED error from wallet recovery/create flows.
 * Returns updated error and isOTPRequired flag.
 */
export function handleOtpRecoveryError(error: OpenfortError, hasWalletRecoveryOTP: boolean): HandleOtpErrorResult {
  if (error.message !== 'OTP_REQUIRED') {
    return { error, isOTPRequired: false }
  }

  const newError = hasWalletRecoveryOTP
    ? new OpenfortError('OTP code is required to recover the wallet.', OpenfortReactErrorType.WALLET_ERROR)
    : new OpenfortError(
        'OTP code is required to recover the wallet.\nPlease set requestWalletRecoveryOTP or requestWalletRecoveryOTPEndpoint in OpenfortProvider.',
        OpenfortReactErrorType.WALLET_ERROR
      )

  return { error: newError, isOTPRequired: true }
}
