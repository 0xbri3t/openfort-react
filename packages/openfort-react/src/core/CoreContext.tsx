/**
 * Core Context Provider
 *
 * Provides configuration to child components.
 * The Openfort SDK client is created by CoreOpenfortProvider (single instance).
 */

import type { OpenfortSDKConfiguration } from '@openfort/openfort-js'
import { createContext, type PropsWithChildren, type ReactNode, useContext, useMemo } from 'react'
import { OpenfortError, OpenfortErrorCode } from './errors'
import type { CoreContextValue, CoreProviderConfig, OpenfortConfig } from './types'

const CoreContext = createContext<CoreContextValue | null>(null)

/**
 * Build SDK config shape for _sdkConfig (used by hooks). Does not create Openfort instance.
 */
function buildSdkConfig(config: CoreProviderConfig): OpenfortSDKConfiguration {
  if (!config.publishableKey) {
    throw new OpenfortError(
      'publishableKey is required. Get your key from https://dashboard.openfort.io',
      OpenfortErrorCode.INVALID_CONFIG
    )
  }

  const shieldConfiguration = config.shieldPublishableKey
    ? {
        shieldPublishableKey: config.shieldPublishableKey,
        ...(typeof window !== 'undefined' && window.location
          ? {
              passkeyRpId: window.location.hostname,
              passkeyRpName: typeof document !== 'undefined' ? document.title || 'Openfort DApp' : 'Openfort DApp',
            }
          : {}),
      }
    : undefined

  return {
    baseConfiguration: { publishableKey: config.publishableKey },
    shieldConfiguration,
    debug: config.debug,
  }
}

export type CoreProviderProps = PropsWithChildren<CoreProviderConfig>

/**
 * Core provider that initializes the Openfort SDK client
 *
 * This is the base layer of the provider hierarchy. It provides:
 * - Openfort SDK client instance
 * - Configuration access
 *
 * @example
 * ```tsx
 * <CoreProvider
 *   publishableKey="pk_live_..."
 *   shieldPublishableKey="shield_pk_..."
 *   rpcUrls={{
 *     ethereum: { 1: 'https://...' },
 *     solana: { 'mainnet-beta': 'https://...' },
 *   }}
 * >
 *   <App />
 * </CoreProvider>
 * ```
 */
export function CoreProvider({ children, ...config }: CoreProviderProps): ReactNode {
  const sdkConfig = useMemo(
    () => buildSdkConfig(config),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [config.publishableKey, config.shieldPublishableKey, config.debug]
  )

  const fullConfig: OpenfortConfig = useMemo(
    () => ({
      ...config,
      _sdkConfig: sdkConfig,
    }),
    [
      config.publishableKey,
      config.shieldPublishableKey,
      config.rpcUrls,
      config.solana,
      config.ethereumPolicyId,
      config.debug,
      sdkConfig,
    ]
  )

  const value: CoreContextValue = useMemo(
    () => ({
      config: fullConfig,
      debug: config.debug ?? false,
    }),
    [fullConfig, config.debug]
  )

  return <CoreContext.Provider value={value}>{children}</CoreContext.Provider>
}

/**
 * Hook to access the core context (Openfort client, config, debug)
 */
export function useCoreContext(): CoreContextValue {
  const context = useContext(CoreContext)
  if (!context) {
    throw new OpenfortError(
      'useCoreContext must be used within OpenfortProvider. Make sure you have wrapped your app with <OpenfortProvider>.',
      OpenfortErrorCode.MISSING_PROVIDER
    )
  }
  return context
}

/**
 * Hook to check if inside CoreProvider
 */
function _useHasCoreProvider(): boolean {
  return useContext(CoreContext) !== null
}
