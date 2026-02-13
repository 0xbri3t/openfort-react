import { useCallback, useState } from 'react'
import { type Abi, type ContractFunctionArgs, type ContractFunctionName, encodeFunctionData } from 'viem'
import { OpenfortError, OpenfortErrorCode } from '../../core/errors'
import { useOpenfortCore } from '../../openfort/useOpenfort'
import type { OpenfortEmbeddedEthereumWalletProvider } from '../types'
import { useEthereumEmbeddedWallet } from './useEthereumEmbeddedWallet'

type WriteableMutability = 'payable' | 'nonpayable'

export interface EthereumWriteContractParams<
  TAbi extends Abi = Abi,
  TFunctionName extends ContractFunctionName<TAbi, WriteableMutability> = ContractFunctionName<
    TAbi,
    WriteableMutability
  >,
> {
  abi: TAbi
  address: `0x${string}`
  functionName: TFunctionName
  args?: ContractFunctionArgs<TAbi, WriteableMutability, TFunctionName>
  value?: bigint
  chainId?: number
  gas?: bigint
}

export interface UseEthereumWriteContractReturn {
  writeContractAsync: <TAbi extends Abi, TFunctionName extends ContractFunctionName<TAbi, WriteableMutability>>(
    params: EthereumWriteContractParams<TAbi, TFunctionName>
  ) => Promise<`0x${string}`>
  data: `0x${string}` | undefined
  isPending: boolean
  /** Alias for isPending. Use for consistent hook shape across all async hooks. */
  isLoading: boolean
  isError: boolean
  isSuccess: boolean
  error: Error | null
  reset: () => void
}

export function useEthereumWriteContract(): UseEthereumWriteContractReturn {
  const { client } = useOpenfortCore()
  const ethereum = useEthereumEmbeddedWallet()

  const [data, setData] = useState<`0x${string}` | undefined>(undefined)
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const reset = useCallback(() => {
    setData(undefined)
    setIsPending(false)
    setError(null)
  }, [])

  const writeContractAsync = useCallback(
    async <TAbi extends Abi, TFunctionName extends ContractFunctionName<TAbi, WriteableMutability>>(
      params: EthereumWriteContractParams<TAbi, TFunctionName>
    ): Promise<`0x${string}`> => {
      setIsPending(true)
      setError(null)

      try {
        let provider: OpenfortEmbeddedEthereumWalletProvider
        if (ethereum.status === 'connected') {
          provider = await ethereum.activeWallet.getProvider()
        } else {
          provider = (await client.embeddedWallet.getEthereumProvider()) as OpenfortEmbeddedEthereumWalletProvider
        }

        const accounts = (await provider.request({ method: 'eth_accounts' })) as `0x${string}`[]
        if (!accounts || accounts.length === 0) {
          throw new OpenfortError('No accounts available', OpenfortErrorCode.WALLET_NOT_FOUND)
        }

        const from = accounts[0]
        const callData = encodeFunctionData(params as Parameters<typeof encodeFunctionData>[0])

        const txParams: Record<string, string | undefined> = {
          from,
          to: params.address,
          data: callData,
          value: params.value ? `0x${params.value.toString(16)}` : undefined,
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
            : new OpenfortError('Transaction failed', OpenfortErrorCode.TRANSACTION_UNKNOWN, {
                cause: err,
              })
        setError(error)
        setIsPending(false)
        throw error
      }
    },
    [client, ethereum]
  )

  return {
    writeContractAsync,
    data,
    isPending,
    isLoading: isPending,
    isError: error != null,
    isSuccess: !isPending && data != null,
    error,
    reset,
  }
}
