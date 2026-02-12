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

/**
 * Returns a transaction signer for @solana/kit when wallet is connected.
 *
 * @returns TransactionPartialSigner or undefined when disconnected
 *
 * @example
 * ```tsx
 * const signer = useSolanaSigner()
 * if (signer) {
 *   const [signed] = await signAndSendTransaction({ transaction, signers: [signer] })
 * }
 * ```
 */
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

/**
 * Returns a message signer for @solana/kit when wallet is connected.
 *
 * @returns MessagePartialSigner or undefined when disconnected
 *
 * @example
 * ```tsx
 * const signer = useSolanaMessageSigner()
 * if (signer) {
 *   const sig = await signMessage({ message, signer })
 * }
 * ```
 */
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
