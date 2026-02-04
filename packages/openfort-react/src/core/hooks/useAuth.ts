/**
 * Hook for authentication state (read-only)
 *
 * This hook provides read-only access to the current authentication state.
 * For login/logout actions, use the specific auth hooks (useEmailAuth, useOAuth, etc.)
 */

import type { EmbeddedState, User } from '@openfort/openfort-js'

import { useAuthContext } from '../AuthContext'

/**
 * Return type for useAuth hook
 */
export type UseAuthReturn = {
  /** Current authenticated user, or null if not authenticated */
  user: User | null

  /** Whether the user is authenticated */
  isAuthenticated: boolean

  /** Current embedded wallet state */
  embeddedState: EmbeddedState

  /** Whether the wallet needs recovery */
  needsRecovery: boolean

  /** Refresh user data from server */
  refreshUser: () => Promise<User | null>

  /** Logout the current user */
  logout: () => Promise<void>
}

/**
 * Access authentication state
 *
 * Provides read-only access to the current user and authentication status.
 * Use this hook to check if a user is logged in and access their profile.
 *
 * @returns Current authentication state
 * @throws ProviderNotFoundError if not within OpenfortProvider
 *
 * @example
 * ```tsx
 * function Profile() {
 *   const { user, isAuthenticated, logout } = useAuth()
 *
 *   if (!isAuthenticated) {
 *     return <LoginButton />
 *   }
 *
 *   return (
 *     <div>
 *       <p>Welcome, {user?.email}</p>
 *       <button onClick={logout}>Logout</button>
 *     </div>
 *   )
 * }
 * ```
 */
export function useAuth(): UseAuthReturn {
  const { user, isAuthenticated, embeddedState, needsRecovery, updateUser, logout } = useAuthContext()

  return {
    user,
    isAuthenticated,
    embeddedState,
    needsRecovery,
    refreshUser: updateUser,
    logout,
  }
}
