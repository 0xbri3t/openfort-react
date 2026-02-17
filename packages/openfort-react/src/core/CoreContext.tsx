/**
 * Core Context Provider
 *
 * Provides the Openfort SDK client and configuration to all child components.
 * This is the foundation layer - no wagmi, no auth state, just the client.
 */

import { Openfort, type OpenfortSDKConfiguration } from '@openfort/openfort-js'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createContext, type PropsWithChildren, type ReactNode, useContext, useMemo } from 'react'
import { OpenfortError, OpenfortErrorCode } from './errors'
import type { CoreContextValue, CoreProviderConfig, OpenfortConfig } from './types'

const CoreContext = createContext<CoreContextValue | null>(null)

/**
 * Create a query client with Openfort-optimized defaults
 */
function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000, // 30 seconds
        retry: 2,
        refetchOnWindowFocus: false,
      },
    },
  })
}

/**
 * Transform user config into full SDK configuration
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
        // Default passkey config for browser environment
        ...(typeof window !== 'undefined' && window.location
          ? {
              passkeyRpId: window.location.hostname,
              passkeyRpName: typeof document !== 'undefined' ? document.title || 'Openfort DApp' : 'Openfort DApp',
            }
          : {}),
      }
    : undefined

  return {
    baseConfiguration: {
      publishableKey: config.publishableKey,
    },
    shieldConfiguration,
    debug: config.debug,
  }
}

export type CoreProviderProps = PropsWithChildren<
  CoreProviderConfig & {
    /**
     * Custom React Query client
     * If not provided, a default client is created
     */
    queryClient?: QueryClient
  }
>

/**
 * Core provider that initializes the Openfort SDK client
 *
 * This is the base layer of the provider hierarchy. It provides:
 * - Openfort SDK client instance
 * - Configuration access
 * - React Query client
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
export function CoreProvider({ children, queryClient: externalQueryClient, ...config }: CoreProviderProps): ReactNode {
  const queryClient = useMemo(() => externalQueryClient ?? createQueryClient(), [externalQueryClient])

  const sdkConfig = useMemo(
    () => buildSdkConfig(config),
    // Only rebuild if these specific config values change
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [config.publishableKey, config.shieldPublishableKey, config.debug]
  )

  const client = useMemo(() => {
    return new Openfort(sdkConfig)
  }, [sdkConfig])

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
      client,
      config: fullConfig,
      debug: config.debug ?? false,
    }),
    [client, fullConfig, config.debug]
  )

  return (
    <QueryClientProvider client={queryClient}>
      <CoreContext.Provider value={value}>{children}</CoreContext.Provider>
    </QueryClientProvider>
  )
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
