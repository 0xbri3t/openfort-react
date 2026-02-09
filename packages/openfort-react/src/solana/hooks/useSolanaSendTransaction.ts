import {
  address,
  appendTransactionMessageInstruction,
  compileTransaction,
  createSolanaRpc,
  createTransactionMessage,
  pipe,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
} from '@solana/kit'
import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useMemo, useState } from 'react'
import { OpenfortTransactionError, TransactionErrorCode } from '../../core/errors'
import { queryKeys } from '../../core/queryKeys'
import { useSolanaContext } from '../providers/SolanaContextProvider'
import { useSolanaEmbeddedWallet } from './useSolanaEmbeddedWallet'

const SYSTEM_PROGRAM_ADDRESS = address('11111111111111111111111111111111')
const TRANSFER_INSTRUCTION_INDEX = 2

function createTransferSolInstruction(
  from: string,
  to: string,
  lamports: bigint
): {
  programAddress: ReturnType<typeof address>
  data: Uint8Array
  accounts: Array<{ address: ReturnType<typeof address>; role: number }>
} {
  const data = new Uint8Array(12)
  const view = new DataView(data.buffer)
  view.setUint32(0, TRANSFER_INSTRUCTION_INDEX, true)
  view.setBigUint64(4, lamports, true)
  return {
    programAddress: SYSTEM_PROGRAM_ADDRESS,
    data,
    accounts: [
      { address: address(from), role: 3 },
      { address: address(to), role: 1 },
    ],
  }
}

export type SolanaSendTransactionStatus = 'idle' | 'signing' | 'sending' | 'confirmed' | 'error'

export type UseSolanaSendTransactionResult = {
  sendTransaction: (params: { to: string; amount: bigint }) => Promise<void>
  status: SolanaSendTransactionStatus
  error: OpenfortTransactionError | null
  reset: () => void
}

export function useSolanaSendTransaction(): UseSolanaSendTransactionResult {
  const queryClient = useQueryClient()
  const { rpcUrl } = useSolanaContext()
  const rpc = useMemo(() => createSolanaRpc(rpcUrl), [rpcUrl])
  const wallet = useSolanaEmbeddedWallet()

  const [status, setStatus] = useState<SolanaSendTransactionStatus>('idle')
  const [error, setError] = useState<OpenfortTransactionError | null>(null)

  const reset = useCallback(() => {
    setStatus('idle')
    setError(null)
  }, [])

  const sendTransaction = useCallback(
    async (params: { to: string; amount: bigint }) => {
      if (wallet.status !== 'connected' || !params.amount || params.amount <= BigInt(0)) {
        setError(new OpenfortTransactionError('Wallet not connected or invalid amount', TransactionErrorCode.UNKNOWN))
        setStatus('error')
        return
      }

      const { provider, activeWallet } = wallet
      const fromAddress = activeWallet.address

      setError(null)
      setStatus('signing')

      try {
        const { value: blockhash } = await rpc.getLatestBlockhash().send()
        const fromAddr = address(fromAddress)
        const transferInstruction = createTransferSolInstruction(fromAddress, params.to, params.amount)

        const message = pipe(
          createTransactionMessage({ version: 0 }),
          (msg) => setTransactionMessageFeePayer(fromAddr, msg),
          (msg) => setTransactionMessageLifetimeUsingBlockhash(blockhash, msg),
          (msg) => appendTransactionMessageInstruction(transferInstruction, msg)
        )

        const compiled = compileTransaction(message)
        const signed = await provider.signTransaction({ messageBytes: compiled })

        setStatus('sending')

        const signature = await rpc
          .sendTransaction(new Uint8Array(Buffer.from(signed.signature, 'base64')), {
            encoding: 'base64',
            preflightCommitment: 'confirmed',
            skipPreflight: false,
          })
          .send()

        if (signature.value) {
          setStatus('confirmed')
          queryClient.invalidateQueries({
            queryKey: queryKeys.solana.balance(fromAddress, rpcUrl),
          })
        } else {
          setStatus('error')
          setError(new OpenfortTransactionError('Transaction failed', TransactionErrorCode.RPC_ERROR))
        }
      } catch (err) {
        setStatus('error')
        const wrapped =
          err instanceof OpenfortTransactionError
            ? err
            : new OpenfortTransactionError(
                err instanceof Error ? err.message : String(err),
                TransactionErrorCode.SIGNING_FAILED,
                { cause: err }
              )
        setError(wrapped)
      }
    },
    [wallet, rpc, rpcUrl, queryClient]
  )

  return { sendTransaction, status, error, reset }
}
