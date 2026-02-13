import { useCallback, useState } from 'react'
import { formatErrorWithReason, OpenfortError, OpenfortErrorCode } from '../../core/errors'

export type TransactionFlowStatus = 'idle' | 'preparing' | 'signing' | 'sending' | 'confirming' | 'confirmed' | 'error'

const LOADING_STATUSES: TransactionFlowStatus[] = ['preparing', 'signing', 'sending', 'confirming']

export type UseTransactionFlowResult = {
  status: TransactionFlowStatus
  /** True when status is preparing, signing, sending, or confirming. Use for consistent hook shape. */
  isLoading: boolean
  isError: boolean
  isSuccess: boolean
  error: OpenfortError | null
  reset: () => void
  execute: (sendFn: () => Promise<void>) => Promise<void>
}

/**
 * Manages transaction flow state for async send operations.
 * Wraps a send function and tracks status (idle, sending, confirmed, error).
 *
 * @returns status, error, reset, and execute(sendFn)
 *
 * @example
 * ```tsx
 * const { status, error, execute } = useTransactionFlow()
 * await execute(() => sendTransaction({ to, amount }))
 * ```
 */
export function useTransactionFlow(): UseTransactionFlowResult {
  const [status, setStatus] = useState<TransactionFlowStatus>('idle')
  const [error, setError] = useState<OpenfortError | null>(null)

  const reset = useCallback(() => {
    setStatus('idle')
    setError(null)
  }, [])

  const execute = useCallback(async (sendFn: () => Promise<void>) => {
    setError(null)
    setStatus('sending')
    try {
      await sendFn()
      setStatus('confirmed')
    } catch (err) {
      const wrapped =
        err instanceof OpenfortError
          ? err
          : new OpenfortError(formatErrorWithReason('Transaction failed', err), OpenfortErrorCode.TRANSACTION_UNKNOWN, {
              cause: err,
            })
      setError(wrapped)
      setStatus('error')
    }
  }, [])

  const isLoading = LOADING_STATUSES.includes(status)
  const isError = status === 'error'
  const isSuccess = status === 'confirmed'

  return { status, isLoading, isError, isSuccess, error, reset, execute }
}
