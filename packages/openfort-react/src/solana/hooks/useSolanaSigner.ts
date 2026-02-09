/**
 * Solana Signer Hooks
 *
 * Provides Kit-compatible signers for use with @solana/kit.
 */

import { useMemo } from 'react'
import {
  createMessageSigner,
  createTransactionSigner,
  type MessagePartialSigner,
  type TransactionPartialSigner,
} from '../signers/OpenfortSolanaSigner'
import { useSolanaEmbeddedWallet } from './useSolanaEmbeddedWallet'

export function useSolanaSigner(): TransactionPartialSigner | undefined {
  const solana = useSolanaEmbeddedWallet()

  const signer = useMemo(() => {
    if (solana.status !== 'connected') {
      return undefined
    }

    return createTransactionSigner(solana.provider)
  }, [solana.status, solana.status === 'connected' ? solana.provider : null])

  return signer
}

export function useSolanaMessageSigner(): MessagePartialSigner | undefined {
  const solana = useSolanaEmbeddedWallet()

  const signer = useMemo(() => {
    if (solana.status !== 'connected') {
      return undefined
    }

    return createMessageSigner(solana.provider)
  }, [solana.status, solana.status === 'connected' ? solana.provider : null])

  return signer
}
