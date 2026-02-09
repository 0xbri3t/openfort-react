/**
 * Ethereum Wallet Operations
 *
 * Pure functions for signing and transaction operations.
 * Extracted from hooks for testability and reusability.
 */

import type { Openfort } from '@openfort/openfort-js'

import { OpenfortError, OpenfortReactErrorType } from '../types'

import type { OpenfortEmbeddedEthereumWalletProvider } from './types'

export interface SignMessageParams {
  /** Message to sign */
  message: string
  /** Openfort client */
  client: Openfort
}

/** EIP-712 type definition */
export type TypedDataField = { name: string; type: string }

/** EIP-712 types record */
export type TypedDataTypes = {
  [key: string]: TypedDataField[]
} & { EIP712Domain?: TypedDataField[] }

export interface SignTypedDataParams {
  /** Domain for EIP-712 */
  domain: Record<string, unknown>
  /** Types for EIP-712 */
  types: TypedDataTypes
  /** Message to sign */
  message: Record<string, unknown>
  /** Openfort client */
  client: Openfort
}

export interface SendTransactionParams {
  /** Transaction to send */
  to: `0x${string}`
  /** Value in wei */
  value?: bigint
  /** Transaction data */
  data?: `0x${string}`
  /** Chain ID */
  chainId?: number
  /** Gas limit */
  gasLimit?: bigint
  /** Provider */
  provider: OpenfortEmbeddedEthereumWalletProvider
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
      : new OpenfortError('Signing failed', OpenfortReactErrorType.WALLET_ERROR, { error })
  }
}

/**
 * Sign typed data using EIP-712
 *
 * @param params - Sign typed data parameters
 * @returns Signature as hex string
 *
 * @example
 * ```ts
 * const signature = await signTypedData({
 *   domain: { name: 'MyApp', version: '1' },
 *   types: { Message: [{ name: 'content', type: 'string' }] },
 *   message: { content: 'Hello' },
 *   client: openfortClient,
 * });
 * ```
 */
export async function signTypedData(params: SignTypedDataParams): Promise<`0x${string}`> {
  const { domain, types, message, client } = params

  try {
    // SDK expects 3 separate arguments: domain, types, message
    const signature = await client.embeddedWallet.signTypedData(domain, types, message)
    return signature as `0x${string}`
  } catch (error) {
    throw error instanceof OpenfortError
      ? error
      : new OpenfortError('Signing failed', OpenfortReactErrorType.WALLET_ERROR, { error })
  }
}

/**
 * Send a transaction via the EIP-1193 provider
 *
 * @param params - Send transaction parameters
 * @returns Transaction hash
 *
 * @example
 * ```ts
 * const txHash = await sendTransaction({
 *   to: '0x...',
 *   value: 1000000000000000000n, // 1 ETH
 *   provider,
 * });
 * ```
 */
export async function sendTransaction(params: SendTransactionParams): Promise<`0x${string}`> {
  const { to, value, data, chainId, gasLimit, provider } = params

  try {
    const accounts = (await provider.request({ method: 'eth_accounts' })) as `0x${string}`[]
    if (!accounts || accounts.length === 0) {
      throw new OpenfortError('No accounts available', OpenfortReactErrorType.WALLET_ERROR)
    }

    const from = accounts[0]

    const txHash = await provider.request({
      method: 'eth_sendTransaction',
      params: [
        {
          from,
          to,
          value: value ? `0x${value.toString(16)}` : undefined,
          data,
          chainId: chainId ? `0x${chainId.toString(16)}` : undefined,
          gas: gasLimit ? `0x${gasLimit.toString(16)}` : undefined,
        },
      ],
    })

    return txHash as `0x${string}`
  } catch (error) {
    throw error instanceof OpenfortError
      ? error
      : new OpenfortError('Transaction failed', OpenfortReactErrorType.WALLET_ERROR, { error })
  }
}

/**
 * Get the EIP-1193 provider from Openfort client
 *
 * @param client - Openfort client
 * @returns EIP-1193 provider
 */
export async function getEthereumProvider(client: Openfort): Promise<OpenfortEmbeddedEthereumWalletProvider> {
  try {
    const provider = await client.embeddedWallet.getEthereumProvider()
    return provider as OpenfortEmbeddedEthereumWalletProvider
  } catch (error) {
    throw error instanceof OpenfortError
      ? error
      : new OpenfortError('Wallet not found', OpenfortReactErrorType.WALLET_ERROR, { error })
  }
}
