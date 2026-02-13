export const OpenfortErrorCode = {
  // Configuration errors
  MISSING_PROVIDER: 'MISSING_PROVIDER',
  INVALID_CONFIG: 'INVALID_CONFIG',
  MISSING_PUBLISHABLE_KEY: 'MISSING_PUBLISHABLE_KEY',

  // Authentication errors
  AUTH_FAILED: 'AUTH_FAILED',
  NOT_AUTHENTICATED: 'NOT_AUTHENTICATED',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  EMAIL_NOT_VERIFIED: 'EMAIL_NOT_VERIFIED',

  // Wallet errors
  WALLET_NOT_FOUND: 'WALLET_NOT_FOUND',
  WALLET_CREATION_FAILED: 'WALLET_CREATION_FAILED',
  WALLET_RECOVERY_REQUIRED: 'WALLET_RECOVERY_REQUIRED',
  SIGNING_FAILED: 'SIGNING_FAILED',
  TRANSACTION_FAILED: 'TRANSACTION_FAILED',

  // Transaction-specific errors (granular codes for transaction failures)
  TRANSACTION_USER_REJECTED: 'TRANSACTION_USER_REJECTED',
  TRANSACTION_INSUFFICIENT_FUNDS: 'TRANSACTION_INSUFFICIENT_FUNDS',
  TRANSACTION_RPC_ERROR: 'TRANSACTION_RPC_ERROR',
  TRANSACTION_SIGNING_FAILED: 'TRANSACTION_SIGNING_FAILED',
  TRANSACTION_UNKNOWN: 'TRANSACTION_UNKNOWN',

  // Chain-specific errors
  UNSUPPORTED_CHAIN: 'UNSUPPORTED_CHAIN',
  RPC_ERROR: 'RPC_ERROR',

  // General errors
  NETWORK_ERROR: 'NETWORK_ERROR',
  POLLING_FAILED: 'POLLING_FAILED',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const

export type OpenfortErrorCode = (typeof OpenfortErrorCode)[keyof typeof OpenfortErrorCode]

/**
 * Base error class for Openfort React SDK (canonical v1)
 *
 * @example
 * ```ts
 * try {
 *   await wallet.signMessage('hello')
 * } catch (error) {
 *   if (error instanceof OpenfortError) {
 *     switch (error.code) {
 *       case OpenfortErrorCode.NOT_AUTHENTICATED:
 *         // Handle auth error
 *         break
 *       case OpenfortErrorCode.SIGNING_FAILED:
 *         // Handle signing error
 *         break
 *     }
 *   }
 * }
 * ```
 */
export class OpenfortError extends Error {
  readonly code: OpenfortErrorCode

  /** Original error — available for SDK consumers who want to inspect, but NOT included in `.message` */
  readonly cause?: unknown

  constructor(message: string, code: OpenfortErrorCode, options?: { cause?: unknown }) {
    super(message)
    this.name = 'OpenfortError'
    this.code = code
    this.cause = options?.cause

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, OpenfortError)
    }
  }

  /**
   * Create error from unknown error type.
   * SECURITY: Original error goes into `cause` for debugging only — never exposed in `.message`.
   */
  static from(error: unknown, fallbackCode: OpenfortErrorCode = OpenfortErrorCode.UNKNOWN_ERROR): OpenfortError {
    if (error instanceof OpenfortError) return error
    return new OpenfortError('An unexpected error occurred', fallbackCode, { cause: error })
  }
}
