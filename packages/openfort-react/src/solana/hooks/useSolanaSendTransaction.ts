import type { Base64EncodedWireTransaction } from '@solana/kit'
import {
  address,
  appendTransactionMessageInstruction,
  compileTransaction,
  createSolanaRpc,
  createTransactionMessage,
  getBase58Encoder,
  pipe,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
} from '@solana/kit'
import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useMemo, useState } from 'react'
import { OpenfortTransactionError, TransactionErrorCode } from '../../core/errors'
import { queryKeys } from '../../core/queryKeys'
import { useSolanaContext } from '../SolanaContext'
import { toUint8Array, unwrapTransactionSignature } from '../utils/transactionHelpers'
import { createTransferSolInstruction } from '../utils/transfer'
import { useSolanaEmbeddedWallet } from './useSolanaEmbeddedWallet'

export type SolanaSendTransactionStatus = 'idle' | 'signing' | 'sending' | 'confirmed' | 'error'

export type UseSolanaSendTransactionResult = {
  sendTransaction: (params: { to: string; amount: bigint }) => Promise<string | undefined>
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
        const messageBytes = toUint8Array(compiled.messageBytes)
        const signed = await provider.signTransaction({ messageBytes })

        setStatus('sending')

        const sigStr = typeof signed.signature === 'string' ? signed.signature : String(signed.signature)
        const signatureBytes = new Uint8Array(getBase58Encoder().encode(sigStr))
        if (signatureBytes.length !== 64) {
          throw new OpenfortTransactionError(
            `Invalid signature length: ${signatureBytes.length}, expected 64`,
            TransactionErrorCode.SIGNING_FAILED
          )
        }
        const wire = new Uint8Array(1 + signatureBytes.length + messageBytes.length)
        wire[0] = 1
        wire.set(signatureBytes, 1)
        wire.set(messageBytes, 1 + signatureBytes.length)
        const base64Wire = Buffer.from(wire).toString('base64')
        const result = await rpc
          .sendTransaction(base64Wire as Base64EncodedWireTransaction, {
            encoding: 'base64',
            preflightCommitment: 'confirmed',
            skipPreflight: true,
          })
          .send()
        const signatureValue = unwrapTransactionSignature(result)
        if (signatureValue) {
          setStatus('confirmed')
          queryClient.invalidateQueries({
            queryKey: queryKeys.solana.balance(fromAddress, rpcUrl),
          })
          return signatureValue
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
        return
      }
    },
    [wallet, rpc, rpcUrl, queryClient]
  )

  return { sendTransaction, status, error, reset }
}
