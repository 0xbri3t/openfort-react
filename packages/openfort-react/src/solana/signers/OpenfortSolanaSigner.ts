/**
 * Openfort Kit Signer Implementation
 *
 * Provides @solana/kit compatible signers that wrap the OpenfortSolanaProvider.
 * These signers can be used directly with @solana/kit and @solana/react-hooks.
 */

import type { OpenfortEmbeddedSolanaWalletProvider, SignatureDictionary, SolanaAddress } from '../types'

export type { SolanaAddress as Address }

/**
 * Transaction message bytes interface
 * Compatible with @solana/transactions
 */
export interface TransactionMessageBytes {
  readonly messageBytes: Uint8Array
}

/**
 * Transaction with lifetime (blockhash or durable nonce)
 * Compatible with @solana/transactions
 */
export interface TransactionWithLifetime {
  readonly lifetimeConstraint?: unknown
}

/**
 * Full transaction type for signing
 */
export type SignableTransaction = TransactionMessageBytes & TransactionWithLifetime

/**
 * Configuration for transaction signing
 * Compatible with @solana/signers TransactionPartialSignerConfig
 */
export interface TransactionPartialSignerConfig {
  /** Signal to abort the signing operation */
  abortSignal?: AbortSignal
}

/**
 * TransactionPartialSigner interface from @solana/signers
 *
 * A partial signer signs transactions but may not be the only signer.
 * Multiple partial signers can sign the same transaction.
 */
export interface TransactionPartialSigner<TAddress extends string = string> {
  /** The address of this signer (Base58 encoded) */
  readonly address: TAddress
  /**
   * Sign one or more transactions
   *
   * @param transactions - Array of transactions to sign
   * @param config - Optional configuration including abort signal
   * @returns Array of signature dictionaries mapping address to signature
   */
  signTransactions(
    transactions: readonly SignableTransaction[],
    config?: TransactionPartialSignerConfig
  ): Promise<readonly SignatureDictionary[]>
}

/**
 * Message to sign interface
 * Compatible with @solana/signers
 */
export interface SignableMessage {
  /** Message content as string or bytes */
  content: string | Uint8Array
}

/**
 * MessagePartialSigner interface from @solana/signers
 */
export interface MessagePartialSigner<TAddress extends string = string> {
  /** The address of this signer (Base58 encoded) */
  readonly address: TAddress
  /**
   * Sign one or more messages
   *
   * @param messages - Array of messages to sign
   * @returns Array of signature dictionaries mapping address to signature
   */
  signMessages(messages: readonly SignableMessage[]): Promise<readonly SignatureDictionary[]>
}

/**
 * Openfort Transaction Partial Signer
 *
 * A Kit-compatible TransactionPartialSigner that uses OpenfortSolanaProvider
 * for signing. Can be used directly with @solana/kit and @solana/react-hooks.
 *
 * @example
 * ```ts
 * const signer = new OpenfortTransactionPartialSigner(address, provider);
 *
 * // Use with @solana/kit
 * const signatures = await signer.signTransactions([transaction]);
 * ```
 */
export class OpenfortTransactionPartialSigner implements TransactionPartialSigner {
  readonly address: SolanaAddress
  private readonly provider: OpenfortEmbeddedSolanaWalletProvider

  /**
   * Creates a new OpenfortTransactionPartialSigner
   *
   * @param address - The Solana address of this signer (Base58)
   * @param provider - The OpenfortSolanaProvider to use for signing
   */
  constructor(address: SolanaAddress, provider: OpenfortEmbeddedSolanaWalletProvider) {
    this.address = address
    this.provider = provider
  }

  /**
   * Sign transactions using the Openfort provider
   *
   * @param transactions - Array of transactions to sign
   * @param config - Optional configuration including abort signal
   * @returns Array of signature dictionaries
   * @throws If the abort signal is triggered
   */
  async signTransactions(
    transactions: readonly SignableTransaction[],
    config?: TransactionPartialSignerConfig
  ): Promise<readonly SignatureDictionary[]> {
    // Check for abort signal before signing
    config?.abortSignal?.throwIfAborted()

    // Extract message bytes from transactions
    const txsToSign = transactions.map((tx) => ({
      messageBytes: tx.messageBytes,
    }))

    // Sign all transactions using the provider
    const signedTransactions = await this.provider.signAllTransactions(txsToSign)

    // Check for abort signal after signing (in case it was triggered during)
    config?.abortSignal?.throwIfAborted()

    // Map signed transactions to signature dictionaries
    return signedTransactions.map((signed) => ({
      [this.address]: signed.signature,
    })) as readonly SignatureDictionary[]
  }
}

/**
 * Openfort Message Partial Signer
 *
 * A Kit-compatible MessagePartialSigner that uses OpenfortSolanaProvider
 * for signing messages.
 *
 * @example
 * ```ts
 * const signer = new OpenfortMessagePartialSigner(address, provider);
 *
 * // Sign messages
 * const signatures = await signer.signMessages([{ content: 'Hello!' }]);
 * ```
 */
export class OpenfortMessagePartialSigner implements MessagePartialSigner {
  readonly address: SolanaAddress
  private readonly provider: OpenfortEmbeddedSolanaWalletProvider

  /**
   * Creates a new OpenfortMessagePartialSigner
   *
   * @param address - The Solana address of this signer (Base58)
   * @param provider - The OpenfortSolanaProvider to use for signing
   */
  constructor(address: SolanaAddress, provider: OpenfortEmbeddedSolanaWalletProvider) {
    this.address = address
    this.provider = provider
  }

  /**
   * Sign messages using the Openfort provider
   *
   * @param messages - Array of messages to sign
   * @returns Array of signature dictionaries
   */
  async signMessages(messages: readonly SignableMessage[]): Promise<readonly SignatureDictionary[]> {
    // Sign each message
    const signatures = await Promise.all(
      messages.map(async (message) => {
        // Convert content to string if needed
        const content =
          typeof message.content === 'string' ? message.content : new TextDecoder().decode(message.content)

        const signature = await this.provider.signMessage(content)
        return signature
      })
    )

    // Map to signature dictionaries
    return signatures.map((signature) => ({
      [this.address]: signature,
    })) as readonly SignatureDictionary[]
  }
}

/**
 * Creates a TransactionPartialSigner from an Openfort provider
 *
 * @param provider - The OpenfortSolanaProvider to wrap
 * @returns A Kit-compatible TransactionPartialSigner
 *
 * @example
 * ```ts
 * const signer = createTransactionSigner(provider);
 * // Use with @solana/kit
 * ```
 */
export function createTransactionSigner(
  provider: OpenfortEmbeddedSolanaWalletProvider
): OpenfortTransactionPartialSigner {
  return new OpenfortTransactionPartialSigner(provider.publicKey as SolanaAddress, provider)
}

/**
 * Creates a MessagePartialSigner from an Openfort provider
 *
 * @param provider - The OpenfortSolanaProvider to wrap
 * @returns A Kit-compatible MessagePartialSigner
 *
 * @example
 * ```ts
 * const signer = createMessageSigner(provider);
 * const signatures = await signer.signMessages([{ content: 'Hello!' }]);
 * ```
 */
export function createMessageSigner(provider: OpenfortEmbeddedSolanaWalletProvider): OpenfortMessagePartialSigner {
  return new OpenfortMessagePartialSigner(provider.publicKey as SolanaAddress, provider)
}
