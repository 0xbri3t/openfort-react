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

import type { OpenfortError } from './core/errors'

export { OpenfortError } from './core/errors'

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
