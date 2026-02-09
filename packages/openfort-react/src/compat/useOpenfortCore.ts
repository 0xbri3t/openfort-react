/**
 * Deprecated useOpenfortCore wrapper
 *
 * Provides backwards compatibility while encouraging migration to new hooks.
 * Shows a single deprecation warning per session in development mode.
 */

import { useContext } from 'react'
import { type ContextValue, Openfortcontext } from '../components/Openfort/context'
import { logger } from '../utils/logger'

let hasWarned = false

/**
 * Access the legacy Openfort context.
 *
 * @deprecated Use specific hooks instead:
 * - `useConnectUI()` for modal/navigation state
 * - `useAuth()` for user authentication state
 * - `useOpenfortClient()` for SDK access
 * - `useEthereumEmbeddedWallet()` for Ethereum wallet operations
 * - `useSolanaEmbeddedWallet()` for Solana wallet operations
 *
 * @example Migration example:
 * ```tsx
 * // Before (deprecated)
 * const { open, setOpen, route, setRoute } = useOpenfortCore();
 *
 * // After (recommended)
 * const { isOpen, openModal, closeModal, currentRoute, navigate } = useConnectUI();
 * ```
 *
 * @see https://openfort.io/docs/migration/v3
 */
export function useOpenfortCore(): ContextValue | null {
  if (process.env.NODE_ENV === 'development' && !hasWarned) {
    logger.warn(
      '[@openfort/react] useOpenfortCore() is deprecated.\n' +
        'Migration guide:\n' +
        '  - Modal/navigation state: useConnectUI()\n' +
        '  - User authentication: useAuth()\n' +
        '  - SDK access: useOpenfortClient()\n' +
        '  - Ethereum wallet: useEthereumEmbeddedWallet()\n' +
        '  - Solana wallet: useSolanaEmbeddedWallet()\n' +
        'See: https://openfort.io/docs/migration/v3'
    )
    hasWarned = true
  }
  return useContext(Openfortcontext)
}

/**
 * Reset the deprecation warning flag (for testing purposes)
 * @internal
 */
export function _resetDeprecationWarning(): void {
  hasWarned = false
}
