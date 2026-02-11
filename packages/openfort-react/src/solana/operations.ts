/**
 * Solana Wallet Operations
 *
 * Pure functions for signing operations.
 * Extracted from hooks for testability and reusability.
 *
 * CRITICAL: Solana uses Ed25519, NOT keccak256.
 * Always set hashMessage: false when signing.
 */

import type { Openfort } from '@openfort/openfort-js'

import { OpenfortError, OpenfortReactErrorType } from '../types'
import { logger } from '../utils/logger'

import type { SignedSolanaTransaction, SolanaTransaction } from './types'

export interface SignMessageParams {
  /** Message to sign (string or Uint8Array) */
  message: string | Uint8Array
  /** Openfort client */
  client: Openfort
}

export interface SignTransactionParams {
  /** Transaction to sign */
  transaction: SolanaTransaction
  /** Public key of the signer */
  publicKey: string
  /** Openfort client */
  client: Openfort
}

export interface SignAllTransactionsParams {
  /** Transactions to sign */
  transactions: SolanaTransaction[]
  /** Public key of the signer */
  publicKey: string
  /** Openfort client */
  client: Openfort
}

/**
 * Sign a message using Ed25519 (Solana standard)
 *
 * CRITICAL: Uses hashMessage: false because Solana uses Ed25519,
 * which does NOT use keccak256 hashing.
 *
 * @param params - Sign message parameters
 * @returns Signature as base58 or hex string
 *
 * @example
 * ```ts
 * const signature = await signMessage({
 *   message: 'Hello, Solana!',
 *   client: openfortClient,
 * });
 * ```
 */
export async function signMessage(params: SignMessageParams): Promise<string> {
  const { message, client } = params

  const messageString = message instanceof Uint8Array ? Buffer.from(message).toString('utf8') : message
  logger.log('[Solana operations.signMessage] start', {
    messageLength: messageString?.length,
    isUint8Array: message instanceof Uint8Array,
  })

  try {
    const signature = await client.embeddedWallet.signMessage(messageString, {
      hashMessage: false, // CRITICAL: Ed25519 - no keccak256
    })

    logger.log('[Solana operations.signMessage] client.embeddedWallet.signMessage returned', {
      signatureLength: (signature as string)?.length,
    })
    return signature as string
  } catch (error) {
    logger.log('[Solana operations.signMessage] client.embeddedWallet.signMessage threw', {
      message: error instanceof Error ? error.message : String(error),
    })
    throw error instanceof OpenfortError
      ? error
      : new OpenfortError('Signing failed', OpenfortReactErrorType.WALLET_ERROR, { error })
  }
}

/**
 * Sign a Solana transaction
 *
 * @param params - Sign transaction parameters
 * @returns Signed transaction with signature and public key
 *
 * @example
 * ```ts
 * const signed = await signTransaction({
 *   transaction: myTransaction,
 *   publicKey: 'ABC...',
 *   client: openfortClient,
 * });
 * ```
 */
export async function signTransaction(params: SignTransactionParams): Promise<SignedSolanaTransaction> {
  const { transaction, publicKey, client } = params

  try {
    const messageBytes = getTransactionBytes(transaction)

    // Sign the transaction bytes (base64 encoded)
    const signature = await client.embeddedWallet.signMessage(Buffer.from(messageBytes).toString('base64'), {
      hashMessage: false, // CRITICAL: Ed25519 - no keccak256
    })

    return {
      signature: signature as string,
      publicKey,
    }
  } catch (error) {
    throw error instanceof OpenfortError
      ? error
      : new OpenfortError('Signing failed', OpenfortReactErrorType.WALLET_ERROR, { error })
  }
}

/**
 * Sign multiple Solana transactions
 *
 * @param params - Sign all transactions parameters
 * @returns Array of signed transactions
 *
 * @example
 * ```ts
 * const signedTxs = await signAllTransactions({
 *   transactions: [tx1, tx2, tx3],
 *   publicKey: 'ABC...',
 *   client: openfortClient,
 * });
 * ```
 */
export async function signAllTransactions(params: SignAllTransactionsParams): Promise<SignedSolanaTransaction[]> {
  const { transactions, publicKey, client } = params

  try {
    const results = await Promise.all(
      transactions.map(async (tx) => {
        return signTransaction({ transaction: tx, publicKey, client })
      })
    )

    return results
  } catch (error) {
    throw error instanceof OpenfortError
      ? error
      : new OpenfortError('Signing failed', OpenfortReactErrorType.WALLET_ERROR, { error })
  }
}

/**
 * Extract message bytes from various Solana transaction formats
 *
 * Supports:
 * - Raw Uint8Array
 * - Object with messageBytes property
 * - Object with serializeMessage() method (legacy Transaction)
 *
 * @param transaction - Transaction in various formats
 * @returns Transaction bytes as Uint8Array
 */
export function getTransactionBytes(transaction: SolanaTransaction): Uint8Array {
  // Raw bytes
  if (transaction instanceof Uint8Array) {
    return transaction
  }

  // Object with messageBytes (VersionedTransaction style)
  if ('messageBytes' in transaction) {
    return transaction.messageBytes
  }

  // Object with serializeMessage (legacy Transaction style)
  if ('serializeMessage' in transaction && typeof transaction.serializeMessage === 'function') {
    return transaction.serializeMessage()
  }

  throw new OpenfortError('Unsupported Solana transaction format', OpenfortReactErrorType.CONFIGURATION_ERROR)
}
