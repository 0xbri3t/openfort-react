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

  // Chain-specific errors
  UNSUPPORTED_CHAIN: 'UNSUPPORTED_CHAIN',
  RPC_ERROR: 'RPC_ERROR',

  // General errors
  NETWORK_ERROR: 'NETWORK_ERROR',
  POLLING_FAILED: 'POLLING_FAILED',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const

export const TransactionErrorCode = {
  USER_REJECTED: 'USER_REJECTED',
  INSUFFICIENT_FUNDS: 'INSUFFICIENT_FUNDS',
  RPC_ERROR: 'RPC_ERROR',
  SIGNING_FAILED: 'SIGNING_FAILED',
  UNKNOWN: 'UNKNOWN',
} as const

export type TransactionErrorCode = (typeof TransactionErrorCode)[keyof typeof TransactionErrorCode]

type OpenfortErrorCode = (typeof OpenfortErrorCode)[keyof typeof OpenfortErrorCode]

/**
 * Base error class for Openfort React SDK (new architecture)
 *
 * @example
 * ```ts
 * try {
 *   await wallet.signMessage('hello')
 * } catch (error) {
 *   if (error instanceof OpenfortReactError) {
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
export class OpenfortReactError extends Error {
  readonly code: OpenfortErrorCode
  readonly cause?: unknown

  constructor(message: string, code: OpenfortErrorCode, options?: { cause?: unknown }) {
    super(message)
    this.name = 'OpenfortReactError'
    this.code = code
    this.cause = options?.cause

    // Maintains proper stack trace for where error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, OpenfortReactError)
    }
  }

  /**
   * Create error from unknown error type
   */
  static from(error: unknown, fallbackCode: OpenfortErrorCode = OpenfortErrorCode.UNKNOWN_ERROR): OpenfortReactError {
    if (error instanceof OpenfortReactError) {
      return error
    }

    if (error instanceof Error) {
      return new OpenfortReactError(error.message, fallbackCode, { cause: error })
    }

    return new OpenfortReactError(String(error), fallbackCode)
  }
}

/**
 * Error thrown when a hook is used outside its required provider
 */
export class ProviderNotFoundError extends OpenfortReactError {
  constructor(message: string) {
    super(message, OpenfortErrorCode.MISSING_PROVIDER)
    this.name = 'ProviderNotFoundError'
  }
}

/**
 * Error thrown for configuration issues
 */
export class ConfigurationError extends OpenfortReactError {
  constructor(message: string, cause?: unknown) {
    super(message, OpenfortErrorCode.INVALID_CONFIG, { cause })
    this.name = 'ConfigurationError'
  }
}

/**
 * Error thrown for wallet operations
 */
class _WalletError extends OpenfortReactError {
  readonly address?: string

  constructor(
    message: string,
    code: OpenfortErrorCode = OpenfortErrorCode.WALLET_NOT_FOUND,
    options?: { cause?: unknown; address?: string }
  ) {
    super(message, code, { cause: options?.cause })
    this.name = 'WalletError'
    this.address = options?.address
  }
}

/**
 * Transaction-specific error. Extends OpenfortReactError for single catch surface.
 */
export class OpenfortTransactionError extends OpenfortReactError {
  readonly txCode: TransactionErrorCode

  constructor(message: string, txCode: TransactionErrorCode, options?: { cause?: unknown }) {
    super(message, OpenfortErrorCode.TRANSACTION_FAILED, { cause: options?.cause })
    this.name = 'OpenfortTransactionError'
    this.txCode = txCode
  }
}
