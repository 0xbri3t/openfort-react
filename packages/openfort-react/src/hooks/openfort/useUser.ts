import { EmbeddedState } from '@openfort/openfort-js'
import { useCallback } from 'react'
import { useOpenfortCore } from '../../openfort/useOpenfort'
import { handleOAuthConfigError } from '../../utils/oauthErrorHandler'

/**
 * Returns the current user, linked accounts, auth state, and token helpers.
 *
 * @returns user, linkedAccounts, isAuthenticated, getAccessToken, validateAndRefreshToken
 *
 * @example
 * ```tsx
 * const { user, isAuthenticated, getAccessToken } = useUser()
 * const token = await getAccessToken()
 * ```
 */
export function useUser() {
  const { user, client, embeddedState, linkedAccounts } = useOpenfortCore()

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
    isAuthenticated: embeddedState !== EmbeddedState.NONE && embeddedState !== EmbeddedState.UNAUTHENTICATED,
    getAccessToken: getAccessTokenAndUpdate,
    validateAndRefreshToken: validateAndRefresh,
  }
}
