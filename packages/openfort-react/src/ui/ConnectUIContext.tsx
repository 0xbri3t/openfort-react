/**
 * Connect UI Context
 *
 * Provides clean UI state management separate from SDK configuration.
 * This context handles modal control, navigation, theme, and form state.
 */

import { createContext, useContext } from 'react'
import type { BuyFormState, RouteOptions, SendFormState, SetRouteOptions } from '../components/Openfort/types'
import { type Mode, OpenfortError, OpenfortReactErrorType, type Theme } from '../types'

/**
 * Clean UI context value for modal control, navigation, and theme management.
 */
export interface ConnectUIValue {
  // Modal control
  /** Whether the connect modal is open */
  isOpen: boolean
  /** Open the connect modal */
  openModal: () => void
  /** Close the connect modal */
  closeModal: () => void

  // Navigation
  /** Current route in the modal */
  currentRoute: RouteOptions
  /** Navigate to a new route */
  navigate: (route: SetRouteOptions) => void
  /** Go back to the previous route */
  goBack: () => void
  /** Route history stack */
  routeHistory: RouteOptions[]

  // Theme
  /** Current theme */
  theme: Theme
  /** Current color mode */
  mode: Mode
  /** Update theme */
  setTheme: (theme: Theme) => void
  /** Update color mode */
  setMode: (mode: Mode) => void

  // Forms (send/buy state)
  /** Form states */
  forms: {
    send: SendFormState
    buy: BuyFormState
  }
  /** Update send form state */
  updateSendForm: (updates: Partial<SendFormState>) => void
  /** Update buy form state */
  updateBuyForm: (updates: Partial<BuyFormState>) => void

  // Resize trigger (for layout adjustments)
  /** Trigger a resize calculation */
  triggerResize: () => void
}

export const ConnectUIContext = createContext<ConnectUIValue | null>(null)

/**
 * Access the Connect UI context for modal control, navigation, and theme.
 *
 * @throws OpenfortError if called outside of OpenfortProvider
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { openModal, closeModal, currentRoute } = useConnectUI();
 *
 *   return (
 *     <button onClick={openModal}>Connect Wallet</button>
 *   );
 * }
 * ```
 */
export function useConnectUI(): ConnectUIValue {
  const context = useContext(ConnectUIContext)
  if (!context) {
    throw new OpenfortError(
      'useConnectUI must be used within OpenfortProvider. Make sure you have wrapped your app with <OpenfortProvider>.',
      OpenfortReactErrorType.CONFIGURATION_ERROR
    )
  }
  return context
}
