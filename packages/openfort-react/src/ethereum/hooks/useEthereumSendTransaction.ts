import { useCallback, useState } from 'react'

import { OpenfortError, OpenfortReactErrorType } from '../../types'
import { useEthereumEmbeddedWallet } from './useEthereumEmbeddedWallet'

export interface EthereumSendTransactionParams {
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

export interface UseEthereumSendTransactionReturn {
  sendTransactionAsync: (params: EthereumSendTransactionParams) => Promise<`0x${string}`>
  data: `0x${string}` | undefined
  isPending: boolean
  error: Error | null
  reset: () => void
}

export function useEthereumSendTransaction(): UseEthereumSendTransactionReturn {
  const ethereum = useEthereumEmbeddedWallet()

  const [data, setData] = useState<`0x${string}` | undefined>(undefined)
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const reset = useCallback(() => {
    setData(undefined)
    setIsPending(false)
    setError(null)
  }, [])

  const sendTransactionAsync = useCallback(
    async (params: EthereumSendTransactionParams): Promise<`0x${string}`> => {
      setIsPending(true)
      setError(null)

      try {
        if (ethereum.status !== 'connected') {
          throw new OpenfortError('Wallet not connected', OpenfortReactErrorType.WALLET_ERROR)
        }

        const provider = await ethereum.activeWallet.getProvider()

        const accounts = (await provider.request({ method: 'eth_accounts' })) as `0x${string}`[]
        if (!accounts || accounts.length === 0) {
          throw new OpenfortError('No accounts available', OpenfortReactErrorType.WALLET_ERROR)
        }

        const from = accounts[0]

        const txParams: Record<string, string | undefined> = {
          from,
          to: params.to,
          value: params.value ? `0x${params.value.toString(16)}` : undefined,
          data: params.data,
          chainId: params.chainId ? `0x${params.chainId.toString(16)}` : undefined,
          gas: params.gas ? `0x${params.gas.toString(16)}` : undefined,
        }

        Object.keys(txParams).forEach((key) => {
          if (txParams[key] === undefined) delete txParams[key]
        })

        const txHash = (await provider.request({
          method: 'eth_sendTransaction',
          params: [txParams],
        })) as `0x${string}`

        setData(txHash)
        setIsPending(false)
        return txHash
      } catch (err) {
        const error =
          err instanceof OpenfortError
            ? err
            : new OpenfortError('Transaction failed', OpenfortReactErrorType.WALLET_ERROR, { error: err })
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
