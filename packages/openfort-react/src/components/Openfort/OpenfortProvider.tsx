import {
  ChainTypeEnum,
  RecoveryMethod,
  type SDKOverrides,
  type ThirdPartyAuthConfiguration,
} from '@openfort/openfort-js'
import { Buffer } from 'buffer'
import type React from 'react'
import { createElement, Fragment, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { CoreProvider } from '../../core/CoreContext'
import { OpenfortEthereumBridgeContext } from '../../ethereum/OpenfortEthereumBridgeContext'
import { useThemeFont } from '../../hooks/useGoogleFont'
import { CoreOpenfortProvider } from '../../openfort/CoreOpenfortProvider'
import type { useConnectCallbackProps } from '../../openfort/connectCallbackTypes'
import { SolanaContextProvider, type SolanaContextProviderProps } from '../../solana/SolanaContext'
import type { CustomTheme, Languages, Mode, Theme } from '../../types'
import { ConnectUIContext, type ConnectUIValue } from '../../ui/ConnectUIContext'
import { logger } from '../../utils/logger'
import { isFamily } from '../../utils/wallets'
import ConnectKitModal from '../ConnectModal'
import { type ContextValue, OpenfortContext } from './context'
import {
  type BuyFormState,
  type ConnectUIOptions,
  type DebugModeOptions,
  defaultBuyFormState,
  defaultSendFormState,
  notStoredInHistoryRoutes,
  type OpenfortUIOptionsExtended,
  type OpenfortWalletConfig,
  type RouteOptions,
  routes,
  type SendFormState,
  type SetRouteOptions,
  UIAuthProvider,
} from './types'

/** {@link OpenfortProvider} props. */
type OpenfortProviderProps = {
  children?: React.ReactNode
  debugMode?: boolean | DebugModeOptions
  chainType?: ChainTypeEnum
  publishableKey: string
  uiConfig?: ConnectUIOptions
  walletConfig?: OpenfortWalletConfig
  overrides?: SDKOverrides
  thirdPartyAuth?: ThirdPartyAuthConfiguration
} & useConnectCallbackProps

let openfortProviderWarnedNoWagmi = false

/** Provides Openfort configuration and context to descendant components. */
/**
 * Root provider for Openfort. Wrap your app with this to enable connect modal, auth, and wallet features.
 * Requires publishableKey. Use with wagmi's OpenfortProvider for EVM + wagmi.
 *
 * @example
 * ```tsx
 * <OpenfortProvider publishableKey="pk_test_..." chainType={ChainTypeEnum.EVM}>
 *   <App />
 * </OpenfortProvider>
 * ```
 */
export const OpenfortProvider = ({
  children,
  uiConfig,
  onConnect,
  onDisconnect,
  debugMode,
  chainType: chainTypeProp,
  publishableKey,
  walletConfig,
  overrides,
  thirdPartyAuth,
}: OpenfortProviderProps) => {
  const bridge = useContext(OpenfortEthereumBridgeContext)
  const hasWagmi = !!bridge
  const hasSolana = !!walletConfig?.solana
  const hasEthereum = !!walletConfig?.ethereum
  const chainType = chainTypeProp ?? (hasSolana ? ChainTypeEnum.SVM : ChainTypeEnum.EVM)

  if (chainType === ChainTypeEnum.SVM && !hasSolana) {
    throw new Error(
      'OpenfortProvider with chainType SVM requires walletConfig.solana. ' +
        'Pass walletConfig={{ solana: { cluster: "mainnet-beta" } }} (or use chainType EVM for Ethereum).'
    )
  }

  if (chainType === ChainTypeEnum.EVM && !hasEthereum) {
    throw new Error(
      'OpenfortProvider with chainType EVM requires walletConfig.ethereum. ' +
        'Pass walletConfig={{ ethereum: { chainId: 1 } }} (or use chainType SVM for Solana).'
    )
  }

  // Only allow for mounting OpenfortProvider once, so we avoid weird global
  // state collisions.
  if (useContext(OpenfortContext)) {
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

  const injectedConnector = bridge?.connectors?.find((c) => c.id === 'injected')
  const allowAutomaticRecovery = !!(walletConfig?.createEncryptedSessionEndpoint || walletConfig?.getEncryptionSession)

  const defaultUIOptions: OpenfortUIOptionsExtended = {
    appName: 'Openfort',
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
    authProviders: hasWagmi
      ? [UIAuthProvider.GUEST, UIAuthProvider.EMAIL_OTP, UIAuthProvider.WALLET]
      : [UIAuthProvider.GUEST, UIAuthProvider.EMAIL_OTP],
  }

  const safeUiConfig: OpenfortUIOptionsExtended = Object.assign({}, defaultUIOptions, uiConfig)

  if (!hasWagmi && safeUiConfig.authProviders?.includes(UIAuthProvider.WALLET)) {
    safeUiConfig.authProviders = safeUiConfig.authProviders.filter((p) => p !== UIAuthProvider.WALLET)
    if (process.env.NODE_ENV === 'development' && !openfortProviderWarnedNoWagmi) {
      openfortProviderWarnedNoWagmi = true
      logger.warn(
        '[@openfort/react] UIAuthProvider.WALLET was removed from authProviders because no Wagmi bridge is present. Add OpenfortWagmiBridge to enable external wallet sign-in.'
      )
    }
  }

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
    if (safeUiConfig.bufferPolyfill && !window.Buffer) {
      window.Buffer = Buffer
    }
  }

  const [ckTheme, setTheme] = useState<Theme>(safeUiConfig.theme ?? 'auto')
  const [ckMode, setMode] = useState<Mode>(safeUiConfig.mode ?? 'auto')
  const [ckCustomTheme, setCustomTheme] = useState<CustomTheme | undefined>(safeUiConfig.customTheme ?? {})
  const [ckLang, setLang] = useState<Languages>('en-US')
  const [open, setOpenWithoutHistory] = useState<boolean>(false)
  const initialConnector: ContextValue['connector'] = { id: '' }
  const [connector, setConnector] = useState<ContextValue['connector']>(initialConnector)
  const [route, setRoute] = useState<RouteOptions>({ route: routes.LOADING })
  const [routeHistory, setRouteHistory] = useState<RouteOptions[]>([])

  const [resize, onResize] = useState<number>(0)
  const [emailInput, setEmailInput] = useState('')
  const [phoneInput, setPhoneInput] = useState('')
  const [sendForm, setSendForm] = useState<SendFormState>(defaultSendFormState)
  const [buyForm, setBuyForm] = useState<BuyFormState>(defaultBuyFormState)
  const [headerLeftSlot, setHeaderLeftSlot] = useState<React.ReactNode | null>(null)

  const setOpen = useCallback((value: boolean) => {
    if (value) {
      setRouteHistory([])
    }
    setOpenWithoutHistory(value)
  }, [])

  // Include Google Font that is needed for a themes
  useThemeFont(safeUiConfig.embedGoogleFonts ? ckTheme : ('' as Theme))

  // Other Configuration
  useEffect(() => setTheme(safeUiConfig.theme ?? 'auto'), [safeUiConfig.theme])
  useEffect(() => setMode(safeUiConfig.mode ?? 'auto'), [safeUiConfig.mode])
  useEffect(() => setCustomTheme(safeUiConfig.customTheme ?? {}), [safeUiConfig.customTheme])
  useEffect(() => setLang(safeUiConfig.language || 'en-US'), [safeUiConfig.language])

  const chain = bridge?.account.chain
  const isConnected = bridge?.account.isConnected ?? false
  const isChainSupported = !chain?.id || (bridge?.config.chains?.some((c) => c.id === chain.id) ?? false)

  useEffect(() => {
    if (hasWagmi && isConnected && safeUiConfig.enforceSupportedChains && !isChainSupported) {
      setOpen(true)
      setRoute({ route: routes.SWITCHNETWORKS })
    }
  }, [hasWagmi, isConnected, isChainSupported, safeUiConfig.enforceSupportedChains, setOpen, setRoute])

  useEffect(() => {
    if (hasWagmi && isFamily() && injectedConnector && bridge) {
      bridge.connect({ connector: injectedConnector })
    }
  }, [hasWagmi, injectedConnector, bridge])

  useEffect(() => {
    logger.log('ROUTE', route)
  }, [route])

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

  const value: ContextValue = useMemo(
    () => ({
      chainType,
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
      headerLeftSlot,
      setHeaderLeftSlot,
      previousRoute: routeHistory.length > 1 ? routeHistory[routeHistory.length - 2] : null,
      setPreviousRoute,
      routeHistory,
      setRouteHistory,
      connector,
      setConnector,
      debugMode: debugModeOptions,
      resize,
      triggerResize,
      publishableKey,
      uiConfig: safeUiConfig,
      walletConfig,
      overrides,
      thirdPartyAuth,
      emailInput,
      setEmailInput,
      phoneInput,
      setPhoneInput,
      sendForm,
      setSendForm,
      buyForm,
      setBuyForm,
      onConnect,
      onDisconnect,
    }),
    [
      chainType,
      ckMode,
      ckLang,
      open,
      setOpen,
      route,
      typedSetRoute,
      onBack,
      setPreviousRoute,
      routeHistory,
      connector,
      debugModeOptions,
      resize,
      triggerResize,
      safeUiConfig,
      publishableKey,
      walletConfig,
      overrides,
      thirdPartyAuth,
      emailInput,
      phoneInput,
      sendForm,
      buyForm,
      headerLeftSlot,
      onConnect,
      onDisconnect,
    ]
  )

  const connectUIValue: ConnectUIValue = useMemo(
    () => ({
      isOpen: open,
      openModal: () => setOpen(true),
      closeModal: () => setOpen(false),
      currentRoute: route,
      navigate: typedSetRoute,
      goBack: setPreviousRoute,
      routeHistory,
      theme: ckTheme,
      mode: safeUiConfig.mode ?? ckMode,
      setTheme,
      setMode,
      forms: { send: sendForm, buy: buyForm },
      updateSendForm: (updates) => setSendForm((prev) => ({ ...prev, ...updates })),
      updateBuyForm: (updates) => setBuyForm((prev) => ({ ...prev, ...updates })),
      triggerResize,
    }),
    [
      open,
      setOpen,
      route,
      typedSetRoute,
      setPreviousRoute,
      routeHistory,
      ckTheme,
      safeUiConfig.mode,
      ckMode,
      setTheme,
      setMode,
      sendForm,
      buyForm,
      setSendForm,
      setBuyForm,
      triggerResize,
    ]
  )

  const coreProviderConfig = useMemo(
    () => ({
      publishableKey,
      shieldPublishableKey: walletConfig?.shieldPublishableKey,
      debug: debugModeOptions.openfortCoreDebugMode,
      rpcUrls: walletConfig?.ethereum?.rpcUrls,
    }),
    [
      publishableKey,
      walletConfig?.shieldPublishableKey,
      walletConfig?.ethereum?.rpcUrls,
      debugModeOptions.openfortCoreDebugMode,
    ]
  )

  const innerChildren = createElement(
    Fragment,
    null,
    debugModeOptions.debugRoutes &&
      createElement(
        'pre',
        {
          style: {
            position: 'absolute',
            top: 0,
            left: 0,
            fontSize: '14px',
            color: 'gray',
            background: 'white',
            zIndex: 9999,
          },
        },
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
        )
      ),
    children,
    createElement(ConnectKitModal, {
      lang: ckLang,
      theme: ckTheme,
      mode: safeUiConfig.mode ?? ckMode,
      customTheme: ckCustomTheme,
    })
  )

  const coreOpenfortChildren = hasSolana
    ? createElement(
        SolanaContextProvider,
        { config: walletConfig!.solana! } as SolanaContextProviderProps,
        innerChildren
      )
    : innerChildren

  return createElement(
    ConnectUIContext.Provider,
    { value: connectUIValue },
    createElement(
      OpenfortContext.Provider,
      { value },
      createElement(
        CoreProvider,
        coreProviderConfig,
        createElement(
          CoreOpenfortProvider,
          {
            openfortConfig: {
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
            },
            onConnect,
            onDisconnect,
          },
          coreOpenfortChildren
        )
      )
    )
  )
}
