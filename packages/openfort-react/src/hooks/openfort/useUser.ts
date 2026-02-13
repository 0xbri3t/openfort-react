import { EmbeddedState } from '@openfort/openfort-js'
import { useCallback } from 'react'
import { useOpenfortCore } from '../../openfort/useOpenfort'
import { handleOAuthConfigError } from '../../utils/oauthErrorHandler'
import { useConnectedWallet } from '../useConnectedWallet'

/**
 * Returns the current user, linked accounts, auth state, wallet readiness, and token helpers.
 *
 * Use `isReady` for the common "am I connected?" check: true when authenticated and wallet is ready.
 *
 * @remarks Client-only. Use in a Client Component (e.g. add `"use client"` in Next.js App Router).
 *
 * @returns user, linkedAccounts, isAuthenticated, isWalletReady, isReady, getAccessToken, validateAndRefreshToken
 *
 * @example
 * ```tsx
 * const { user, isAuthenticated, isWalletReady, isReady, getAccessToken } = useUser()
 *
 * if (!isReady) return <Spinner />
 * // User is authenticated and wallet is connected — safe to send/sign
 *
 * const token = await getAccessToken()
 * ```
 */
export function useUser() {
  const { user, client, embeddedState, linkedAccounts } = useOpenfortCore()
  const wallet = useConnectedWallet()

  const isAuthenticated = embeddedState !== EmbeddedState.NONE && embeddedState !== EmbeddedState.UNAUTHENTICATED
  const isWalletReady = wallet.isConnected
  const isReady = isAuthenticated && isWalletReady

  const getAccessTokenAndUpdate = useCallback(async () => {
    try {
      await client.validateAndRefreshToken()
      const token = await client.getAccessToken()
      return token
    } catch (error: unknown) {
      handleOAuthConfigError(error)
      throw error
    }
  }, [client])

  const validateAndRefresh = useCallback(async () => {
    try {
      await client.validateAndRefreshToken()
    } catch (error: unknown) {
      handleOAuthConfigError(error)
      throw error
    }
  }, [client])

  return {
    user,
    linkedAccounts,
    isAuthenticated,
    isWalletReady,
    isReady,
    getAccessToken: getAccessTokenAndUpdate,
    validateAndRefreshToken: validateAndRefresh,
  }
}
