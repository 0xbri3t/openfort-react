/**
 * Error handling for @openfort/react
 *
 * Provides typed error classes with error codes for better error handling.
 * Maintains backwards compatibility with existing OpenfortError.
 */

/**
 * Error codes for Openfort React SDK
 */
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
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const

export type OpenfortErrorCode = (typeof OpenfortErrorCode)[keyof typeof OpenfortErrorCode]

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
 * Error thrown when provider context is missing
 */
export class ProviderNotFoundError extends OpenfortReactError {
  constructor(hookName: string) {
    super(
      `${hookName} must be used within OpenfortProvider. ` +
        'Make sure you have wrapped your app with <OpenfortProvider>.',
      OpenfortErrorCode.MISSING_PROVIDER
    )
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
 * Error thrown for authentication failures
 */
export class AuthenticationError extends OpenfortReactError {
  constructor(message: string, code: OpenfortErrorCode = OpenfortErrorCode.AUTH_FAILED, cause?: unknown) {
    super(message, code, { cause })
    this.name = 'AuthenticationError'
  }
}

/**
 * Error thrown for wallet operations
 */
export class WalletError extends OpenfortReactError {
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
 * Check if error is an Openfort error
 */
export function isOpenfortError(error: unknown): error is OpenfortReactError {
  return error instanceof OpenfortReactError
}

/**
 * Check if error has a specific code
 */
export function hasErrorCode(error: unknown, code: OpenfortErrorCode): boolean {
  return isOpenfortError(error) && error.code === code
}

/**
 * Assert condition or throw error
 */
export function invariant(
  condition: unknown,
  message: string,
  code: OpenfortErrorCode = OpenfortErrorCode.UNKNOWN_ERROR
): asserts condition {
  if (!condition) {
    throw new OpenfortReactError(message, code)
  }
}
