/**
 * Playground-only: sign messages with Openfort Solana embedded wallet.
 * Returns { data, signMessage, isPending, error }. Not part of SDK.
 */

import { useSolanaEmbeddedWallet } from '@openfort/react'
import { createMessageSigner } from '@openfort/react/solana'
import { useCallback, useMemo, useState } from 'react'

export function useSolanaMessageSigner() {
  const solana = useSolanaEmbeddedWallet()
  const [data, setData] = useState<string | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [isPending, setIsPending] = useState(false)

  const signer = useMemo(() => {
    if (solana.status !== 'connected') return undefined
    return createMessageSigner(solana.provider)
  }, [solana.status, solana.status === 'connected' ? solana.provider : null])

  const signMessage = useCallback(
    async (params: { message: string }) => {
      if (!signer) {
        setError(new Error('Wallet not connected'))
        return
      }
      setError(null)
      setIsPending(true)
      try {
        const results = await signer.signMessages([{ content: params.message }])
        const sig = results[0]
        const value = typeof sig === 'object' && sig !== null && Object.values(sig)[0]
        setData(typeof value === 'string' ? value : String(value))
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)))
      } finally {
        setIsPending(false)
      }
    },
    [signer]
  )

  return { data: data ?? undefined, signMessage, isPending, error: error ?? null }
}
