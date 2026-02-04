/**
 * Solana Signer Hooks
 *
 * Provides Kit-compatible signers for use with @solana/kit.
 *
 * @see RFC-0001 Section 5.3
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
 * Hook that returns a Kit-compatible TransactionPartialSigner
 *
 * Returns undefined if the wallet is not connected.
 * Use this with @solana/kit for transaction signing.
 *
 * @returns TransactionPartialSigner or undefined if not connected
 *
 * @example
 * ```tsx
 * import { useSolanaSigner } from '@openfort/react/solana';
 *
 * function MyComponent() {
 *   const signer = useSolanaSigner();
 *
 *   if (!signer) {
 *     return <p>Connect wallet first</p>;
 *   }
 *
 *   // Use with @solana/kit
 *   const handleSign = async () => {
 *     const signatures = await signer.signTransactions([transaction]);
 *     console.log('Signed:', signatures);
 *   };
 *
 *   return <button onClick={handleSign}>Sign Transaction</button>;
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
 * Hook that returns a Kit-compatible MessagePartialSigner
 *
 * Returns undefined if the wallet is not connected.
 * Use this with @solana/kit for message signing.
 *
 * @returns MessagePartialSigner or undefined if not connected
 *
 * @example
 * ```tsx
 * import { useSolanaMessageSigner } from '@openfort/react/solana';
 *
 * function MyComponent() {
 *   const messageSigner = useSolanaMessageSigner();
 *
 *   if (!messageSigner) {
 *     return <p>Connect wallet first</p>;
 *   }
 *
 *   const handleSign = async () => {
 *     const signatures = await messageSigner.signMessages([
 *       { content: 'Hello Solana!' }
 *     ]);
 *     console.log('Signatures:', signatures);
 *   };
 *
 *   return <button onClick={handleSign}>Sign Message</button>;
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
