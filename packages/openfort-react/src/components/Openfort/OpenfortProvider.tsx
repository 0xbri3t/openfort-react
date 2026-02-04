import { RecoveryMethod, type SDKOverrides, type ThirdPartyAuthConfiguration } from '@openfort/openfort-js'
import { Buffer } from 'buffer'
import type React from 'react'
import { createElement, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { useConnectCallbackProps } from '../../hooks/useConnectCallback'
import { useThemeFont } from '../../hooks/useGoogleFont'
import { useAccountSafe, useChainIsSupportedSafe, useConnectorSafe, useHasWagmi } from '../../hooks/useWagmiSafe'
import { CoreOpenfortProvider } from '../../openfort/CoreOpenfortProvider'
import { SolanaContextProvider } from '../../solana/providers/SolanaContextProvider'
import type { CustomTheme, Languages, Mode, Theme } from '../../types'
import { logger } from '../../utils/logger'
import { isFamily } from '../../utils/wallets'
import ConnectKitModal from '../ConnectModal'
import { Web3ContextProvider } from '../contexts/web3'
import { type ContextValue, Openfortcontext } from './context'
import {
  type BuyFormState,
  type ConnectUIOptions,
  type DebugModeOptions,
  defaultBuyFormState,
  defaultSendFormState,
  type ErrorMessage,
  notStoredInHistoryRoutes,
  type OpenfortUIOptionsExtended,
  type OpenfortWalletConfig,
  type RouteOptions,
  routes,
  type SendFormState,
  type SetRouteOptions,
  UIAuthProvider,
} from './types'

type OpenfortProviderProps = {
  children?: React.ReactNode
  debugMode?: boolean | DebugModeOptions

  publishableKey: string
  uiConfig?: ConnectUIOptions
  walletConfig?: OpenfortWalletConfig
  overrides?: SDKOverrides
  thirdPartyAuth?: ThirdPartyAuthConfiguration
} & useConnectCallbackProps

/**
 * Provides Openfort configuration and context to descendant components.
 *
 * The provider supports three modes:
 * 1. **Ethereum only** - Wrap with WagmiProvider (required for Ethereum)
 * 2. **Solana only** - Configure `walletConfig.solana` (no WagmiProvider needed)
 * 3. **Both chains** - Wrap with WagmiProvider and configure `walletConfig.solana`
 *
 * @param props - Provider configuration including callbacks, UI options and the wrapped children.
 * @returns A React element that sets up the Openfort context.
 * @throws If neither WagmiProvider nor Solana config is provided, or if mounted multiple times.
 *
 * @example Ethereum only (existing behavior)
 * ```tsx
 * import { WagmiConfig, createConfig } from 'wagmi';
 * import { OpenfortProvider } from '@openfort/openfort-react';
 *
 * const config = createConfig({ YOUR_WAGMI_CONFIG_HERE });
 *
 * export function App() {
 *   return (
 *     <WagmiConfig config={config}>
 *       <OpenfortProvider publishableKey="pk_...">
 *         <YourApp />
 *       </OpenfortProvider>
 *     </WagmiConfig>
 *   );
 * }
 * ```
 *
 * @example Solana only (no WagmiProvider required)
 * ```tsx
 * import { OpenfortProvider } from '@openfort/openfort-react';
 *
 * export function App() {
 *   return (
 *     <OpenfortProvider
 *       publishableKey="pk_..."
 *       walletConfig={{
 *         shieldPublishableKey: 'shield_pk_...',
 *         solana: { cluster: 'mainnet-beta' }
 *       }}
 *     >
 *       <YourApp />
 *     </OpenfortProvider>
 *   );
 * }
 * ```
 *
 * @example Both Ethereum and Solana
 * ```tsx
 * import { WagmiConfig, createConfig } from 'wagmi';
 * import { OpenfortProvider } from '@openfort/openfort-react';
 *
 * export function App() {
 *   return (
 *     <WagmiConfig config={wagmiConfig}>
 *       <OpenfortProvider
 *         publishableKey="pk_..."
 *         walletConfig={{
 *           shieldPublishableKey: 'shield_pk_...',
 *           solana: { cluster: 'mainnet-beta' }
 *         }}
 *       >
 *         <YourApp />
 *       </OpenfortProvider>
 *     </WagmiConfig>
 *   );
 * }
 * ```
 *
 * @see RFC-0001 Section 1.2-1.4
 */
export const OpenfortProvider = ({
  children,
  uiConfig,
  onConnect,
  onDisconnect,
  debugMode,

  publishableKey,
  walletConfig,
  overrides,
  thirdPartyAuth,
}: OpenfortProviderProps) => {
  // Check if Wagmi is available (optional now for Solana-only mode)
  const hasWagmi = useHasWagmi()

  // Check if Solana is configured
  const hasSolana = !!walletConfig?.solana

  // Require at least one chain to be configured
  if (!hasWagmi && !hasSolana) {
    throw new Error(
      'OpenfortProvider requires either WagmiProvider (for Ethereum) or walletConfig.solana (for Solana). ' +
        'Wrap with WagmiProvider for Ethereum support, or pass walletConfig={{ solana: { cluster: "mainnet-beta" } }} for Solana-only mode.'
    )
  }

  // Only allow for mounting OpenfortProvider once, so we avoid weird global
  // state collisions.
  if (useContext(Openfortcontext)) {
    throw new Error('Multiple, nested usages of OpenfortProvider detected. Please use only one.')
  }

  const debugModeOptions: Required<DebugModeOptions & { debugRoutes?: boolean }> = useMemo(() => {
    const getDebugMode = () => {
      if (typeof debugMode === 'undefined') {
        return {
          shieldDebugMode: false,
          openfortCoreDebugMode: false,
          openfortReactDebugMode: false,
          debugRoutes: false,
        }
      } else if (typeof debugMode === 'boolean') {
        return {
          shieldDebugMode: debugMode,
          openfortCoreDebugMode: debugMode,
          openfortReactDebugMode: debugMode,
          debugRoutes: false,
        }
      } else {
        return {
          shieldDebugMode: debugMode.shieldDebugMode ?? false,
          openfortCoreDebugMode: debugMode.openfortCoreDebugMode ?? false,
          openfortReactDebugMode: debugMode.openfortReactDebugMode ?? false,
          debugRoutes: (debugMode as any).debugRoutes ?? false,
        }
      }
    }
    const debugModeOptions = getDebugMode()
    logger.enabled = debugModeOptions.openfortReactDebugMode
    return debugModeOptions
  }, [debugMode])

  // Use safe hooks that work without WagmiProvider (for Solana-only mode)
  const injectedConnector = useConnectorSafe('injected')
  const allowAutomaticRecovery = !!(walletConfig?.createEncryptedSessionEndpoint || walletConfig?.getEncryptionSession)

  // Default config options
  const defaultUIOptions: OpenfortUIOptionsExtended = {
    theme: 'auto',
    mode: 'auto',
    language: 'en-US',
    hideBalance: false,
    hideTooltips: false,
    hideQuestionMarkCTA: false,
    hideNoWalletCTA: false,
    walletConnectCTA: 'link',
    hideRecentBadge: false,
    avoidLayoutShift: true,
    embedGoogleFonts: false,
    truncateLongENSAddress: true,
    walletConnectName: undefined,
    reducedMotion: false,
    disclaimer: null,
    bufferPolyfill: true,
    customAvatar: undefined,
    enforceSupportedChains: false,
    ethereumOnboardingUrl: undefined,
    walletOnboardingUrl: undefined,
    buyWithCardUrl: undefined,
    buyFromExchangeUrl: undefined,
    buyTroubleshootingUrl: undefined,
    disableSiweRedirect: false,
    walletRecovery: {
      allowedMethods: [RecoveryMethod.PASSWORD, ...(allowAutomaticRecovery ? [RecoveryMethod.AUTOMATIC] : [])],
      defaultMethod: allowAutomaticRecovery ? RecoveryMethod.AUTOMATIC : RecoveryMethod.PASSWORD,
    },
    authProviders: [UIAuthProvider.GUEST, UIAuthProvider.EMAIL_OTP, UIAuthProvider.WALLET],
  }

  const safeUiConfig: OpenfortUIOptionsExtended = Object.assign({}, defaultUIOptions, uiConfig)

  if (!safeUiConfig.walletRecovery.allowedMethods) {
    safeUiConfig.walletRecovery.allowedMethods = defaultUIOptions.walletRecovery.allowedMethods
  }
  if (!safeUiConfig.walletRecovery.defaultMethod) {
    safeUiConfig.walletRecovery.defaultMethod = defaultUIOptions.walletRecovery.defaultMethod
  }

  if (safeUiConfig.walletRecovery.allowedMethods.includes(RecoveryMethod.AUTOMATIC) && !allowAutomaticRecovery) {
    safeUiConfig.walletRecovery.allowedMethods = safeUiConfig.walletRecovery.allowedMethods.filter(
      (m) => m !== RecoveryMethod.AUTOMATIC
    )
    logger.warn(
      'Automatic recovery method was removed from allowedMethods because no recovery options are configured in the walletConfig. Please provide either createEncryptedSessionEndpoint or getEncryptionSession to enable automatic recovery.'
    )
  }

  if (typeof window !== 'undefined') {
    // Buffer Polyfill, needed for bundlers that don't provide Node polyfills (e.g CRA, Vite, etc.)
    if (safeUiConfig.bufferPolyfill) window.Buffer = window.Buffer ?? Buffer

    // Some bundlers may need `global` and `process.env` polyfills as well
    // Not implemented here to avoid unexpected behaviors, but leaving example here for future reference
    /*
     * window.global = window.global ?? window;
     * window.process = window.process ?? { env: {} };
     */
  }

  const [ckTheme, setTheme] = useState<Theme>(safeUiConfig.theme ?? 'auto')
  const [ckMode, setMode] = useState<Mode>(safeUiConfig.mode ?? 'auto')
  const [ckCustomTheme, setCustomTheme] = useState<CustomTheme | undefined>(safeUiConfig.customTheme ?? {})
  const [ckLang, setLang] = useState<Languages>('en-US')
  const [open, setOpenWithoutHistory] = useState<boolean>(false)
  const [connector, setConnector] = useState<ContextValue['connector']>({
    id: '',
  })
  const [route, setRoute] = useState<RouteOptions>({ route: routes.LOADING })
  const [routeHistory, setRouteHistory] = useState<RouteOptions[]>([])

  const [errorMessage, setErrorMessage] = useState<ErrorMessage>('')

  const [resize, onResize] = useState<number>(0)
  const [emailInput, setEmailInput] = useState('')
  const [phoneInput, setPhoneInput] = useState('')
  const [sendForm, setSendForm] = useState<SendFormState>(defaultSendFormState)
  const [buyForm, setBuyForm] = useState<BuyFormState>(defaultBuyFormState)
  const [headerLeftSlot, setHeaderLeftSlot] = useState<React.ReactNode | null>(null)

  const setOpen = (value: boolean) => {
    if (value) {
      setRouteHistory([])
    }
    setOpenWithoutHistory(value)
  }

  // Include Google Font that is needed for a themes
  useThemeFont(safeUiConfig.embedGoogleFonts ? ckTheme : ('' as Theme))

  // Other Configuration
  useEffect(() => setTheme(safeUiConfig.theme ?? 'auto'), [safeUiConfig.theme])
  useEffect(() => setMode(safeUiConfig.mode ?? 'auto'), [safeUiConfig.mode])
  useEffect(() => setCustomTheme(safeUiConfig.customTheme ?? {}), [safeUiConfig.customTheme])
  useEffect(() => setLang(safeUiConfig.language || 'en-US'), [safeUiConfig.language])
  useEffect(() => setErrorMessage(null), [route, open])

  // Check if chain is supported, elsewise redirect to switches page
  // Uses safe hooks that work without WagmiProvider (for Solana-only mode)
  const { chain, isConnected } = useAccountSafe()
  const isChainSupported = useChainIsSupportedSafe(chain?.id)

  // Ethereum-specific: enforce supported chains (only when Wagmi is available)
  useEffect(() => {
    if (hasWagmi && isConnected && safeUiConfig.enforceSupportedChains && !isChainSupported) {
      setOpen(true)
      setRoute({ route: routes.SWITCHNETWORKS })
    }
  }, [hasWagmi, isConnected, isChainSupported, chain, route, open])

  // Ethereum-specific: autoconnect to Family wallet if available
  useEffect(() => {
    if (hasWagmi && isFamily()) {
      injectedConnector?.connect()
    }
  }, [hasWagmi, injectedConnector])

  useEffect(() => {
    logger.log('ROUTE', route)
  }, [route])

  useEffect(() => {
    setHeaderLeftSlot(null)
  }, [route.route])

  const typedSetRoute = useCallback(
    (options: SetRouteOptions) => {
      const routeObj = typeof options === 'string' ? { route: options } : options
      const { route } = routeObj
      const lastRoute = routeHistory.length > 0 ? routeHistory[routeHistory.length - 1] : null

      setRoute(routeObj)

      if (lastRoute && lastRoute.route === route) return
      if (!notStoredInHistoryRoutes.includes(route)) {
        setRouteHistory((prev) => [...prev, routeObj])
      }
    },
    [routeHistory]
  )

  const setPreviousRoute = useCallback(() => {
    setRouteHistory((prev) => {
      const newHistory = [...prev]
      newHistory.pop()
      if (newHistory.length > 0) {
        setRoute(newHistory[newHistory.length - 1])
      } else {
        setRoute({ route: routes.CONNECTED })
      }
      return newHistory
    })
  }, [])

  const triggerResize = useCallback(() => {
    onResize((prev) => prev + 1)
  }, [])

  const [onBack, setOnBack] = useState<(() => void) | null>(null)

  const value: ContextValue = {
    setTheme,
    mode: ckMode,
    setMode,
    setCustomTheme,
    lang: ckLang,
    setLang,
    open,
    setOpen,
    route,
    setRoute: typedSetRoute,
    onBack,
    setOnBack,
    setPreviousRoute,
    routeHistory,
    setRouteHistory,
    previousRoute: routeHistory.length > 1 ? routeHistory[routeHistory.length - 2] : null,
    connector,
    setConnector,
    onConnect,
    onDisconnect,
    // Other configuration
    uiConfig: safeUiConfig,
    errorMessage,
    debugMode: debugModeOptions,
    emailInput,
    setEmailInput,
    phoneInput,
    setPhoneInput,
    resize,
    triggerResize,
    publishableKey,
    walletConfig,
    overrides,
    thirdPartyAuth,
    sendForm,
    setSendForm,
    buyForm,
    setBuyForm,
    headerLeftSlot,
    setHeaderLeftSlot,
  }

  // Wrap children with Solana provider if configured
  const wrappedChildren = hasSolana ? (
    <SolanaContextProvider config={walletConfig!.solana!}>{children}</SolanaContextProvider>
  ) : (
    children
  )

  return createElement(
    Openfortcontext.Provider,
    { value },
    <Web3ContextProvider>
      <CoreOpenfortProvider
        openfortConfig={{
          baseConfiguration: {
            publishableKey,
          },
          shieldConfiguration: walletConfig
            ? {
                shieldPublishableKey: walletConfig.shieldPublishableKey,
                debug: debugModeOptions.shieldDebugMode,
              }
            : undefined,
          debug: debugModeOptions.openfortCoreDebugMode,
          overrides,
          thirdPartyAuth,
        }}
        onConnect={onConnect}
        onDisconnect={onDisconnect}
      >
        {debugModeOptions.debugRoutes && (
          <pre
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              fontSize: '14px',
              color: 'gray',
              background: 'white',
              zIndex: 9999,
            }}
          >
            {
              JSON.stringify(
                routeHistory.map((item) =>
                  Object.fromEntries(
                    Object.entries(item).map(([key, value]) => [
                      key,
                      typeof value === 'object' && value !== null ? '[object]' : value,
                    ])
                  )
                ),
                null,
                2
              ) // For debugging purposes
            }
          </pre>
        )}
        {/* <ThemeProvider
            theme={defaultTheme}
          > */}
        {wrappedChildren}
        <ConnectKitModal lang={ckLang} theme={ckTheme} mode={safeUiConfig.mode ?? ckMode} customTheme={ckCustomTheme} />
        {/* </ThemeProvider> */}
      </CoreOpenfortProvider>
    </Web3ContextProvider>
  )
}
