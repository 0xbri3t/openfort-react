/**
 * UI Provider
 *
 * Manages UI state (modals, navigation, theme, forms) and provides both:
 * - New clean API via ConnectUIContext
 * - Legacy compatibility via OpenfortContext
 */

import { type ReactNode, useCallback, useMemo, useState } from 'react'
import {
  type BuyFormState,
  defaultBuyFormState,
  defaultSendFormState,
  notStoredInHistoryRoutes,
  type RouteOptions,
  routes,
  type SendFormState,
  type SetRouteOptions,
} from '../components/Openfort/types'
import type { Mode, Theme } from '../types'
import { ConnectUIContext, type ConnectUIValue } from './ConnectUIContext'

export interface UIProviderProps {
  /** Child components */
  children: ReactNode
  /** Initial theme */
  theme?: Theme
  /** Initial color mode */
  mode?: Mode
  /** Initial route */
  initialRoute?: RouteOptions
}

function normalizeRoute(route: SetRouteOptions): RouteOptions {
  if (typeof route === 'string') {
    return { route }
  }
  return route
}

/**
 * Provides UI state management for the Connect modal.
 *
 * This provider is typically used internally by OpenfortProvider,
 * but can be used standalone for custom implementations.
 *
 * @example
 * ```tsx
 * // Usually wrapped by OpenfortProvider:
 * <OpenfortProvider publishableKey="pk_...">
 *   <App /> // useConnectUI() available here
 * </OpenfortProvider>
 *
 * // Or standalone:
 * <UIProvider>
 *   <App />
 * </UIProvider>
 * ```
 */
export function UIProvider({
  children,
  theme: initialTheme = 'auto',
  mode: initialMode = 'auto',
  initialRoute = { route: routes.CONNECTORS, connectType: 'connect' },
}: UIProviderProps): ReactNode {
  // Modal state
  const [isOpen, setIsOpen] = useState(false)

  // Navigation state
  const [currentRoute, setCurrentRoute] = useState<RouteOptions>(initialRoute)
  const [routeHistory, setRouteHistory] = useState<RouteOptions[]>([])

  // Theme state
  const [theme, setTheme] = useState<Theme>(initialTheme)
  const [mode, setMode] = useState<Mode>(initialMode)

  // Form state
  const [sendForm, setSendForm] = useState<SendFormState>(defaultSendFormState)
  const [buyForm, setBuyForm] = useState<BuyFormState>(defaultBuyFormState)

  // Resize state (for layout adjustments)
  const [, setResizeCounter] = useState(0)

  // Navigation handlers
  const navigate = useCallback(
    (newRoute: SetRouteOptions) => {
      const normalizedRoute = normalizeRoute(newRoute)

      // Don't add certain routes to history (loading screens, etc.)
      if (!notStoredInHistoryRoutes.includes(currentRoute.route as (typeof notStoredInHistoryRoutes)[number])) {
        setRouteHistory((prev) => [...prev, currentRoute])
      }

      setCurrentRoute(normalizedRoute)
    },
    [currentRoute]
  )

  const goBack = useCallback(() => {
    const previousRoute = routeHistory[routeHistory.length - 1]
    if (previousRoute) {
      setRouteHistory((h) => h.slice(0, -1))
      setCurrentRoute(previousRoute)
    }
  }, [routeHistory])

  // Modal handlers
  const openModal = useCallback(() => setIsOpen(true), [])
  const closeModal = useCallback(() => setIsOpen(false), [])

  // Form handlers
  const updateSendForm = useCallback((updates: Partial<SendFormState>) => {
    setSendForm((prev) => ({ ...prev, ...updates }))
  }, [])

  const updateBuyForm = useCallback((updates: Partial<BuyFormState>) => {
    setBuyForm((prev) => ({ ...prev, ...updates }))
  }, [])

  // Resize trigger
  const triggerResize = useCallback(() => {
    setResizeCounter((c) => c + 1)
  }, [])

  // Build context value
  const value: ConnectUIValue = useMemo(
    () => ({
      // Modal
      isOpen,
      openModal,
      closeModal,

      // Navigation
      currentRoute,
      navigate,
      goBack,
      routeHistory,

      // Theme
      theme,
      mode,
      setTheme,
      setMode,

      // Forms
      forms: { send: sendForm, buy: buyForm },
      updateSendForm,
      updateBuyForm,

      // Resize
      triggerResize,
    }),
    [
      isOpen,
      openModal,
      closeModal,
      currentRoute,
      navigate,
      goBack,
      routeHistory,
      theme,
      mode,
      sendForm,
      buyForm,
      updateSendForm,
      updateBuyForm,
      triggerResize,
    ]
  )

  return <ConnectUIContext.Provider value={value}>{children}</ConnectUIContext.Provider>
}
