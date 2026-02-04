/**
 * Auth Context Provider
 *
 * Manages user authentication state and embedded accounts list.
 * Uses React Query for data fetching and caching.
 */

import { AccountTypeEnum, type EmbeddedAccount, EmbeddedState, type User } from '@openfort/openfort-js'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createContext,
  type PropsWithChildren,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import { logger } from '../utils/logger'
import { useCoreContext } from './CoreContext'
import { ProviderNotFoundError } from './errors'
import type { OnAuthError, OnAuthSuccess } from './types'

// =============================================================================
// Query Keys
// =============================================================================

export const authQueryKeys = {
  all: ['openfort', 'auth'] as const,
  user: () => [...authQueryKeys.all, 'user'] as const,
  embeddedAccounts: (accountType?: AccountTypeEnum) =>
    [...authQueryKeys.all, 'accounts', accountType ?? 'all'] as const,
}

// =============================================================================
// Context Value Type
// =============================================================================

export type AuthContextValue = {
  // User state
  user: User | null
  isAuthenticated: boolean
  embeddedState: EmbeddedState

  // Embedded accounts
  embeddedAccounts: EmbeddedAccount[] | undefined
  isLoadingAccounts: boolean
  refetchAccounts: () => Promise<void>

  // Actions
  logout: () => Promise<void>
  updateUser: (user?: User) => Promise<User | null>

  // Recovery state
  needsRecovery: boolean
}

// =============================================================================
// Context
// =============================================================================

const AuthContext = createContext<AuthContextValue | null>(null)

// =============================================================================
// Provider Props
// =============================================================================

export type AuthProviderProps = PropsWithChildren<{
  /**
   * Account type filter for embedded accounts
   * @default AccountTypeEnum.SMART_ACCOUNT
   */
  accountType?: AccountTypeEnum

  /**
   * Callback when user successfully authenticates
   */
  onAuthSuccess?: OnAuthSuccess

  /**
   * Callback when authentication fails
   */
  onAuthError?: OnAuthError

  /**
   * Polling interval for embedded state (ms)
   * @default 300
   */
  embeddedStatePollingInterval?: number

  // ===========================================================================
  // Deprecated callbacks (for backwards compatibility)
  // ===========================================================================

  /**
   * @deprecated Use `onAuthSuccess` instead. Will be removed in v3.0.
   * For wagmi-specific connect events, use `@openfort/wagmi` package.
   */
  onConnect?: () => void

  /**
   * @deprecated Use logout event handling instead. Will be removed in v3.0.
   * For wagmi-specific disconnect events, use `@openfort/wagmi` package.
   */
  onDisconnect?: () => void
}>

// =============================================================================
// Provider Component
// =============================================================================

/**
 * Auth provider that manages user state and embedded accounts
 *
 * @example
 * ```tsx
 * <CoreProvider publishableKey="pk_...">
 *   <AuthProvider
 *     accountType={AccountTypeEnum.SMART_ACCOUNT}
 *     onAuthSuccess={(user) => console.log('Authenticated:', user.id)}
 *   >
 *     <App />
 *   </AuthProvider>
 * </CoreProvider>
 * ```
 */
export function AuthProvider({
  children,
  accountType = AccountTypeEnum.SMART_ACCOUNT,
  onAuthSuccess,
  onAuthError,
  embeddedStatePollingInterval = 300,
  // Deprecated callbacks
  onConnect,
  onDisconnect,
}: AuthProviderProps): ReactNode {
  const { client, debug } = useCoreContext()
  const queryClient = useQueryClient()

  // Warn about deprecated callbacks in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      if (onConnect) {
        logger.warn(
          '[Openfort] onConnect is deprecated. Use onAuthSuccess instead. ' +
            'For wagmi-specific events, use @openfort/wagmi package.'
        )
      }
      if (onDisconnect) {
        logger.warn(
          '[Openfort] onDisconnect is deprecated. Handle logout events directly. ' +
            'For wagmi-specific events, use @openfort/wagmi package.'
        )
      }
    }
  }, [onConnect, onDisconnect])

  // ==========================================================================
  // Embedded State Polling
  // ==========================================================================

  const [embeddedState, setEmbeddedState] = useState<EmbeddedState>(EmbeddedState.NONE)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const previousStateRef = useRef<EmbeddedState>(EmbeddedState.NONE)

  const pollEmbeddedState = useCallback(async () => {
    try {
      const state = await client.embeddedWallet.getEmbeddedState()
      setEmbeddedState(state)

      // Log state changes in debug mode
      if (debug && previousStateRef.current !== state) {
        logger.log('[Openfort] Embedded state changed:', EmbeddedState[state])
        previousStateRef.current = state
      }
    } catch (error) {
      if (debug) {
        logger.error('[Openfort] Error polling embedded state:', error)
      }
      // Stop polling on error
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }
    }
  }, [client, debug])

  // Start/stop polling
  useEffect(() => {
    pollingRef.current = setInterval(pollEmbeddedState, embeddedStatePollingInterval)
    pollEmbeddedState() // Initial poll

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }
    }
  }, [pollEmbeddedState, embeddedStatePollingInterval])

  // ==========================================================================
  // User State
  // ==========================================================================

  const [user, setUser] = useState<User | null>(null)

  const updateUser = useCallback(
    async (providedUser?: User): Promise<User | null> => {
      if (providedUser) {
        setUser(providedUser)
        onAuthSuccess?.(providedUser)
        onConnect?.() // Deprecated callback
        return providedUser
      }

      try {
        const fetchedUser = await client.user.get()
        setUser(fetchedUser)
        onAuthSuccess?.(fetchedUser)
        onConnect?.() // Deprecated callback
        return fetchedUser
      } catch (error: unknown) {
        if (debug) {
          logger.error('[Openfort] Error fetching user:', error)
        }

        // Handle 401/404 - user not authenticated
        const httpError = error as { response?: { status?: number } }
        if (httpError?.response?.status === 401 || httpError?.response?.status === 404) {
          setUser(null)
          return null
        }

        onAuthError?.(error instanceof Error ? error : new Error(String(error)))
        return null
      }
    },
    [client, debug, onAuthSuccess, onAuthError, onConnect]
  )

  // ==========================================================================
  // React to Embedded State Changes
  // ==========================================================================

  useEffect(() => {
    switch (embeddedState) {
      case EmbeddedState.UNAUTHENTICATED:
        setUser(null)
        break

      case EmbeddedState.EMBEDDED_SIGNER_NOT_CONFIGURED:
      case EmbeddedState.READY:
        // Try to fetch user when signer is ready or needs configuration
        if (!user) {
          updateUser()
        }
        break
    }
  }, [embeddedState, user, updateUser])

  // ==========================================================================
  // Embedded Accounts Query
  // ==========================================================================

  const accountsQuery = useQuery({
    queryKey: authQueryKeys.embeddedAccounts(accountType),
    queryFn: async () => {
      return client.embeddedWallet.list({
        limit: 100,
        accountType: accountType === AccountTypeEnum.EOA ? undefined : accountType,
      })
    },
    enabled: embeddedState === EmbeddedState.READY || embeddedState === EmbeddedState.EMBEDDED_SIGNER_NOT_CONFIGURED,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    retry: false,
  })

  const refetchAccounts = useCallback(async () => {
    await accountsQuery.refetch()
  }, [accountsQuery])

  // ==========================================================================
  // Logout
  // ==========================================================================

  const logout = useCallback(async () => {
    try {
      await client.auth.logout()
      setUser(null)

      // Reset all auth-related queries
      queryClient.removeQueries({ queryKey: authQueryKeys.all })

      // Call deprecated callback
      onDisconnect?.()

      if (debug) {
        logger.log('[Openfort] Logged out')
      }
    } catch (error) {
      if (debug) {
        logger.error('[Openfort] Logout error:', error)
      }
      throw error
    }
  }, [client, queryClient, debug, onDisconnect])

  // ==========================================================================
  // Derived State
  // ==========================================================================

  const isAuthenticated = useMemo(() => {
    return embeddedState !== EmbeddedState.NONE && embeddedState !== EmbeddedState.UNAUTHENTICATED
  }, [embeddedState])

  const needsRecovery = embeddedState === EmbeddedState.EMBEDDED_SIGNER_NOT_CONFIGURED

  // ==========================================================================
  // Context Value
  // ==========================================================================

  const value: AuthContextValue = useMemo(
    () => ({
      user,
      isAuthenticated,
      embeddedState,

      embeddedAccounts: accountsQuery.data,
      isLoadingAccounts: accountsQuery.isPending,
      refetchAccounts,

      logout,
      updateUser,

      needsRecovery,
    }),
    [
      user,
      isAuthenticated,
      embeddedState,
      accountsQuery.data,
      accountsQuery.isPending,
      refetchAccounts,
      logout,
      updateUser,
      needsRecovery,
    ]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// =============================================================================
// Hooks
// =============================================================================

/**
 * Hook to access auth context
 * @internal Use useAuth() instead for public API
 */
export function useAuthContext(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new ProviderNotFoundError('useAuthContext')
  }
  return context
}
