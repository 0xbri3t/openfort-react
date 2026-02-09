import { EmbeddedState } from '@openfort/openfort-js'
import { useCallback } from 'react'
import { useOpenfortCore } from '../../openfort/useOpenfort'
import { handleOAuthConfigError } from '../../utils/oauthErrorHandler'

export function useUser() {
  const { user, client, embeddedState, linkedAccounts } = useOpenfortCore()

  const getAccessTokenAndUpdate = useCallback(async () => {
    try {
      await client.validateAndRefreshToken()
      const token = await client.getAccessToken()
      return token
    } catch (error: any) {
      handleOAuthConfigError(error)
      throw error
    }
  }, [client])

  const validateAndRefresh = useCallback(async () => {
    try {
      await client.validateAndRefreshToken()
    } catch (error: any) {
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
