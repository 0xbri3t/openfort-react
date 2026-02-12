import type { Languages as Lang } from './localizations'
import type { CustomTheme } from './styles/customTheme'
export type { CustomTheme }
export type Languages = Lang

export type Theme = 'auto' | 'web95' | 'retro' | 'soft' | 'midnight' | 'minimal' | 'rounded' | 'nouns'
export type Mode = 'light' | 'dark' | 'auto'

export type All = {
  theme?: Theme
  mode?: Mode
  customTheme?: CustomTheme
  lang?: Languages
}

export type { CustomAvatarProps } from './components/Common/Avatar'
export type {
  ConnectUIOptions as OpenfortOptions,
  OpenfortWalletConfig,
  PhoneConfig,
} from './components/Openfort/types'

export enum OpenfortReactErrorType {
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  WALLET_ERROR = 'WALLET_ERROR',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  UNEXPECTED_ERROR = 'UNEXPECTED_ERROR',
}

interface Data {
  [key: string]: any
}

export type OpenfortErrorOptions = Data & { cause?: unknown }

export class OpenfortError extends Error {
  readonly type: OpenfortReactErrorType
  readonly data: Data
  readonly cause?: unknown

  constructor(message: string, type: OpenfortReactErrorType, data?: OpenfortErrorOptions) {
    const cause = data?.cause ?? (data?.error instanceof Error ? data.error : undefined)

    if (data?.error instanceof OpenfortError) {
      super(data.error.message)
      this.data = data.error.data
      this.type = data.error.type
      this.name = 'OpenfortError'
      this.cause = data.error.cause
      if (Error.captureStackTrace) {
        Error.captureStackTrace(this, OpenfortError)
      }
      return
    } else if (data?.error instanceof Error) {
      super(data.error.message)
      this.type = type
      this.data = { ...data, error: data.error }
      this.cause = data.error
    } else {
      super(message)
      this.type = type
      this.data = data || {}
      this.cause = cause
    }

    this.name = 'OpenfortError'

    // Maintains proper stack trace for where error was thrown (mirrors OpenfortReactError)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, OpenfortError)
    }
  }

  /**
   * Create error from unknown error type (mirrors OpenfortReactError.from)
   */
  static from(
    error: unknown,
    fallbackType: OpenfortReactErrorType = OpenfortReactErrorType.UNEXPECTED_ERROR
  ): OpenfortError {
    if (error instanceof OpenfortError) {
      return error
    }

    if (error instanceof Error) {
      return new OpenfortError(error.message, fallbackType, { cause: error })
    }

    return new OpenfortError(String(error), fallbackType)
  }
}

export type OpenfortHookOptions<T = { error?: OpenfortError }> = {
  onSuccess?: (data: T) => void
  onError?: (error: OpenfortError) => void
  onSettled?: (data: T | undefined | null, error: OpenfortError | null) => void
  throwOnError?: boolean
}

// Re-export important types and enums from openfort-js
export {
  OAuthProvider,
  SDKOverrides,
  ThirdPartyOAuthProvider,
} from '@openfort/openfort-js'
