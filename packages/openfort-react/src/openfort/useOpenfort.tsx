'use client'

import type { OpenfortCoreContextValue } from './CoreOpenfortProvider'
import { useOpenfortStore } from './useOpenfortStore'

/**
 * Access Openfort core context: user, embedded accounts, active chain, auth, and wallet operations.
 * Must be used inside CoreOpenfortProvider (or OpenfortProvider which wraps it).
 *
 * @returns Core context with user, embeddedAccounts, activeChainId, setActiveChainId, logout, etc.
 * @throws Error if used outside CoreOpenfortProvider
 */
export const useOpenfortCore = (): OpenfortCoreContextValue => {
  return useOpenfortStore((s) => s)
}
