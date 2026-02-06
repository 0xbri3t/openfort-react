/**
 * useWriteContract Hook
 *
 * Hook for writing to smart contracts using EIP-1193 provider.
 * Wagmi-free - uses Openfort's embedded wallet provider.
 */

import { useCallback, useState } from 'react'
import { type Abi, type ContractFunctionArgs, type ContractFunctionName, encodeFunctionData } from 'viem'

import { OpenfortErrorCode, OpenfortReactError } from '../core/errors'
import { useEthereumWallet } from '../ethereum/hooks/useEthereumWallet'

/** State-mutating ABI functions (payable or nonpayable) */
type WriteableMutability = 'payable' | 'nonpayable'

export interface WriteContractParams<
  TAbi extends Abi = Abi,
  TFunctionName extends ContractFunctionName<TAbi, WriteableMutability> = ContractFunctionName<
    TAbi,
    WriteableMutability
  >,
> {
  /** Contract ABI */
  abi: TAbi
  /** Contract address */
  address: `0x${string}`
  /** Function name to call (must exist on ABI) */
  functionName: TFunctionName
  /** Function arguments (must match ABI for functionName) */
  args?: ContractFunctionArgs<TAbi, WriteableMutability, TFunctionName>
  /** Value in wei (for payable functions) */
  value?: bigint
  /** Chain ID (optional, uses context if not provided) */
  chainId?: number
  /** Gas limit (optional) */
  gas?: bigint
}

export interface UseWriteContractReturn {
  /** Write to the contract */
  writeContractAsync: <TAbi extends Abi, TFunctionName extends ContractFunctionName<TAbi, WriteableMutability>>(
    params: WriteContractParams<TAbi, TFunctionName>
  ) => Promise<`0x${string}`>
  /** Transaction hash (set after successful write) */
  data: `0x${string}` | undefined
  /** Whether the transaction is being sent */
  isPending: boolean
  /** Error if transaction failed */
  error: Error | null
  /** Reset the state */
  reset: () => void
}

/**
 * Hook for writing to smart contracts.
 *
 * Uses viem for encoding and Openfort's EIP-1193 provider for sending.
 *
 * @example ERC20 transfer
 * ```tsx
 * function TransferToken() {
 *   const { writeContractAsync, isPending } = useWriteContract();
 *
 *   const handleTransfer = async () => {
 *     const hash = await writeContractAsync({
 *       abi: erc20Abi,
 *       address: '0x...',
 *       functionName: 'transfer',
 *       args: ['0x...', parseUnits('100', 18)],
 *     });
 *     console.log('Transaction hash:', hash);
 *   };
 *
 *   return (
 *     <button onClick={handleTransfer} disabled={isPending}>
 *       {isPending ? 'Transferring...' : 'Transfer'}
 *     </button>
 *   );
 * }
 * ```
 */
export function useWriteContract(): UseWriteContractReturn {
  const ethereum = useEthereumWallet()

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
      params: WriteContractParams<TAbi, TFunctionName>
    ): Promise<`0x${string}`> => {
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

        // Encode function data using viem. Our WriteContractParams is typed with
        // ContractFunctionName/ContractFunctionArgs; at the boundary we assert to
        // encodeFunctionData's expected parameter type (no `any`).
        const callData = encodeFunctionData(params as Parameters<typeof encodeFunctionData>[0])

        // Build transaction params
        const txParams: Record<string, string | undefined> = {
          from,
          to: params.address,
          data: callData,
          value: params.value ? `0x ${params.value.toString(16)}` : undefined,
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
    writeContractAsync,
    data,
    isPending,
    error,
    reset,
  }
}
