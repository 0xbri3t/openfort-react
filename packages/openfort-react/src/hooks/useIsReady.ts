import { useUser } from './openfort/useUser'

/**
 * Returns whether the user is authenticated and the wallet is connected and ready.
 *
 * Use this for the common "am I connected?" check instead of combining useUser,
 * useConnectedWallet, and useOpenfort/embeddedState.
 *
 * @returns isReady — true when authenticated and wallet is connected
 *
 * @example
 * ```tsx
 * const { isReady } = useIsReady()
 * if (!isReady) return <Spinner />
 * // Safe to send transactions, sign messages, etc.
 * ```
 */
export function useIsReady() {
  const { isReady } = useUser()
  return { isReady }
}
