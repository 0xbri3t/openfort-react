import { useCallback, useState } from 'react'
import { OpenfortError, OpenfortErrorCode } from '../../core/errors'

export type TransactionFlowStatus = 'idle' | 'preparing' | 'signing' | 'sending' | 'confirming' | 'confirmed' | 'error'

export type UseTransactionFlowResult = {
  status: TransactionFlowStatus
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
          : new OpenfortError('Transaction failed', OpenfortErrorCode.TRANSACTION_UNKNOWN, {
              cause: err,
            })
      setError(wrapped)
      setStatus('error')
    }
  }, [])

  return { status, error, reset, execute }
}
