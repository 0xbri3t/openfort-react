/**
 * Ethereum Wallet Operations
 *
 * Pure functions for signing and transaction operations.
 * Extracted from hooks for testability and reusability.
 */

import type { Openfort } from '@openfort/openfort-js'

import { formatErrorWithReason, OpenfortError, OpenfortErrorCode } from '../core/errors'

export interface SignMessageParams {
  /** Message to sign */
  message: string
  /** Openfort client */
  client: Openfort
}

/**
 * Sign a message using EIP-191 personal_sign
 *
 * @param params - Sign message parameters
 * @returns Signature as hex string
 *
 * @example
 * ```ts
 * const signature = await signMessage({
 *   message: 'Hello, World!',
 *   client: openfortClient,
 * });
 * ```
 */
export async function signMessage(params: SignMessageParams): Promise<`0x${string}`> {
  const { message, client } = params

  try {
    const signature = await client.embeddedWallet.signMessage(message, {
      hashMessage: true, // Keccak256 for EVM
    })
    return signature as `0x${string}`
  } catch (error) {
    throw error instanceof OpenfortError
      ? error
      : new OpenfortError(formatErrorWithReason('Signing failed', error), OpenfortErrorCode.SIGNING_FAILED, {
          cause: error,
        })
  }
}
