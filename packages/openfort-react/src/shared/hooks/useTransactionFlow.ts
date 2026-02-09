import { useCallback, useState } from 'react'
import { OpenfortTransactionError, TransactionErrorCode } from '../../core/errors'

export type TransactionFlowStatus = 'idle' | 'preparing' | 'signing' | 'sending' | 'confirming' | 'confirmed' | 'error'

export type UseTransactionFlowResult = {
  status: TransactionFlowStatus
  error: OpenfortTransactionError | null
  reset: () => void
  execute: (sendFn: () => Promise<void>) => Promise<void>
}

export function useTransactionFlow(): UseTransactionFlowResult {
  const [status, setStatus] = useState<TransactionFlowStatus>('idle')
  const [error, setError] = useState<OpenfortTransactionError | null>(null)

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
        err instanceof OpenfortTransactionError
          ? err
          : new OpenfortTransactionError(
              err instanceof Error ? err.message : String(err),
              TransactionErrorCode.UNKNOWN,
              { cause: err }
            )
      setError(wrapped)
      setStatus('error')
    }
  }, [])

  return { status, error, reset, execute }
}
