/**
 * useSendTransaction Hook
 *
 * Hook for sending native token transactions using EIP-1193 provider.
 * Wagmi-free - uses Openfort's embedded wallet provider.
 *
 * @see Phase E3
 */

import { useCallback, useState } from 'react'

import { OpenfortErrorCode, OpenfortReactError } from '../core/errors'
import { useEthereumWallet } from '../ethereum/hooks/useEthereumWallet'

// =============================================================================
// Types
// =============================================================================

export interface SendTransactionParams {
  /** Target address */
  to: `0x${string}`
  /** Value in wei */
  value?: bigint
  /** Transaction data */
  data?: `0x${string}`
  /** Chain ID (optional, uses context if not provided) */
  chainId?: number
  /** Gas limit (optional) */
  gas?: bigint
}

export interface UseSendTransactionReturn {
  /** Send the transaction */
  sendTransactionAsync: (params: SendTransactionParams) => Promise<`0x${string}`>
  /** Transaction hash (set after successful send) */
  data: `0x${string}` | undefined
  /** Whether the transaction is being sent */
  isPending: boolean
  /** Error if transaction failed */
  error: Error | null
  /** Reset the state */
  reset: () => void
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Hook for sending native token transactions.
 *
 * Uses Openfort's EIP-1193 provider instead of wagmi.
 *
 * @example Basic usage
 * ```tsx
 * function SendETH() {
 *   const { sendTransactionAsync, isPending, error } = useSendTransaction();
 *
 *   const handleSend = async () => {
 *     const hash = await sendTransactionAsync({
 *       to: '0x...',
 *       value: parseEther('0.1'),
 *     });
 *     console.log('Transaction hash:', hash);
 *   };
 *
 *   return (
 *     <button onClick={handleSend} disabled={isPending}>
 *       {isPending ? 'Sending...' : 'Send'}
 *     </button>
 *   );
 * }
 * ```
 */
export function useSendTransaction(): UseSendTransactionReturn {
  const ethereum = useEthereumWallet()

  const [data, setData] = useState<`0x${string}` | undefined>(undefined)
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const reset = useCallback(() => {
    setData(undefined)
    setIsPending(false)
    setError(null)
  }, [])

  const sendTransactionAsync = useCallback(
    async (params: SendTransactionParams): Promise<`0x${string}`> => {
      setIsPending(true)
      setError(null)

      try {
        // Get provider from connected wallet
        if (ethereum.status !== 'connected') {
          throw new OpenfortReactError('Wallet not connected', OpenfortErrorCode.WALLET_NOT_FOUND)
        }

        const provider = await ethereum.activeWallet.getProvider()

        // Get accounts
        const accounts = (await provider.request({ method: 'eth_accounts' })) as `0x${string}`[]
        if (!accounts || accounts.length === 0) {
          throw new OpenfortReactError('No accounts available', OpenfortErrorCode.WALLET_NOT_FOUND)
        }

        const from = accounts[0]

        // Build transaction params
        const txParams: Record<string, string | undefined> = {
          from,
          to: params.to,
          value: params.value ? `0x${params.value.toString(16)}` : undefined,
          data: params.data,
          chainId: params.chainId ? `0x${params.chainId.toString(16)}` : undefined,
          gas: params.gas ? `0x${params.gas.toString(16)}` : undefined,
        }

        // Remove undefined values
        Object.keys(txParams).forEach((key) => {
          if (txParams[key] === undefined) {
            delete txParams[key]
          }
        })

        // Send transaction
        const txHash = (await provider.request({
          method: 'eth_sendTransaction',
          params: [txParams],
        })) as `0x${string}`

        setData(txHash)
        setIsPending(false)
        return txHash
      } catch (err) {
        const error = OpenfortReactError.from(err, OpenfortErrorCode.TRANSACTION_FAILED)
        setError(error)
        setIsPending(false)
        throw error
      }
    },
    [ethereum]
  )

  return {
    sendTransactionAsync,
    data,
    isPending,
    error,
    reset,
  }
}
