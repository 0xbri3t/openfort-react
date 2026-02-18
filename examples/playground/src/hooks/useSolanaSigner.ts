/**
 * Playground-only: Kit-compatible transaction signer from Openfort Solana embedded wallet.
 * Not part of SDK — use @solana/kit with embedded wallet provider directly in your app.
 */

import { useSolanaEmbeddedWallet } from '@openfort/react'
import { createTransactionSigner } from '@openfort/react/solana'
import { useMemo } from 'react'

export function useSolanaSigner() {
  const solana = useSolanaEmbeddedWallet()
  return useMemo(() => {
    if (solana.status !== 'connected') return undefined
    return createTransactionSigner(solana.provider)
  }, [solana.status, solana.status === 'connected' ? solana.provider : null])
}
