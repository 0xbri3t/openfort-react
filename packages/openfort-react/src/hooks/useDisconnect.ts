import { useCallback, useState } from 'react'
import { useOpenfortCore } from '../openfort/useOpenfort'

export type UseDisconnectReturnType = {
  disconnect: () => void
  disconnectAsync: () => Promise<void>
  isPending: boolean
  isError: boolean
  isSuccess: boolean
  error: Error | null
  reset: () => void
}

/**
 * Wagmi-compatible disconnect hook. Performs full logout (auth + wallet).
 * Works in both bridge and embedded mode.
 *
 * @example
 * ```tsx
 * const { disconnect, disconnectAsync, isPending } = useDisconnect()
 * return (
 *   <button onClick={() => disconnect()} disabled={isPending}>
 *     Disconnect
 *   </button>
 * )
 * ```
 */
export function useDisconnect(): UseDisconnectReturnType {
  const { logout } = useOpenfortCore()
  const [isPending, setIsPending] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [isError, setIsError] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const reset = useCallback(() => {
    setIsPending(false)
    setIsSuccess(false)
    setIsError(false)
    setError(null)
  }, [])

  const disconnectAsync = useCallback(async () => {
    setIsPending(true)
    setIsError(false)
    setIsSuccess(false)
    setError(null)
    try {
      await logout()
      setIsSuccess(true)
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e))
      setError(err)
      setIsError(true)
      throw err
    } finally {
      setIsPending(false)
    }
  }, [logout])

  const disconnect = useCallback(() => {
    disconnectAsync().catch(() => {})
  }, [disconnectAsync])

  return {
    disconnect,
    disconnectAsync,
    isPending,
    isError,
    isSuccess,
    error,
    reset,
  }
}
