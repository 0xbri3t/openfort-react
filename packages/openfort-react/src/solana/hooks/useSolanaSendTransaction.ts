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
import { Buffer } from 'buffer'
import { useCallback, useMemo, useState } from 'react'
import { formatErrorWithReason, OpenfortError, OpenfortErrorCode } from '../../core/errors'
import { queryKeys } from '../../core/queryKeys'
import { useSolanaContext } from '../SolanaContext'
import { toUint8Array, unwrapTransactionSignature } from '../utils/transactionHelpers'
import { createTransferSolInstruction } from '../utils/transfer'
import { useSolanaEmbeddedWallet } from './useSolanaEmbeddedWallet'

export type SolanaSendTransactionStatus = 'idle' | 'signing' | 'sending' | 'confirmed' | 'error'

export type UseSolanaSendTransactionResult = {
  sendTransaction: (params: { to: string; amount: bigint }) => Promise<string | undefined>
  status: SolanaSendTransactionStatus
  /** True when status is 'signing' or 'sending'. Use for consistent hook shape. */
  isLoading: boolean
  isError: boolean
  isSuccess: boolean
  error: OpenfortError | null
  reset: () => void
}

/**
 * Returns a sendTransaction helper for Solana. Handles signing and sending via Openfort.
 *
 * @returns sendTransaction({ to, amount }), status, error, and reset
 *
 * @example
 * ```tsx
 * const { sendTransaction, status } = useSolanaSendTransaction()
 * const sig = await sendTransaction({ to: address, amount: lamports })
 * ```
 */
export function useSolanaSendTransaction(): UseSolanaSendTransactionResult {
  const queryClient = useQueryClient()
  const { rpcUrl } = useSolanaContext()
  const rpc = useMemo(() => createSolanaRpc(rpcUrl), [rpcUrl])
  const wallet = useSolanaEmbeddedWallet()

  const [status, setStatus] = useState<SolanaSendTransactionStatus>('idle')
  const [error, setError] = useState<OpenfortError | null>(null)

  const reset = useCallback(() => {
    setStatus('idle')
    setError(null)
  }, [])

  const sendTransaction = useCallback(
    async (params: { to: string; amount: bigint }) => {
      if (wallet.status !== 'connected' || !params.amount || params.amount <= BigInt(0)) {
        setError(new OpenfortError('Wallet not connected or invalid amount', OpenfortErrorCode.TRANSACTION_UNKNOWN))
        setStatus('error')
        return
      }

      const { provider, activeWallet } = wallet
      const fromAddress = activeWallet.address

      setError(null)
      setStatus('signing')

      const attempt = async (): Promise<string | undefined> => {
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
          throw new OpenfortError('Invalid signature format', OpenfortErrorCode.TRANSACTION_SIGNING_FAILED)
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
        return unwrapTransactionSignature(result)
      }

      try {
        let signatureValue: string | undefined
        try {
          signatureValue = await attempt()
          if (!signatureValue) {
            setStatus('signing')
            signatureValue = await attempt()
          }
        } catch {
          setStatus('signing')
          signatureValue = await attempt()
        }
        if (signatureValue) {
          setStatus('confirmed')
          queryClient.invalidateQueries({
            queryKey: queryKeys.solana.balance(fromAddress, rpcUrl),
          })
          return signatureValue
        }
        setStatus('error')
        setError(new OpenfortError('Transaction failed', OpenfortErrorCode.TRANSACTION_RPC_ERROR))
      } catch (err) {
        setStatus('error')
        const wrapped =
          err instanceof OpenfortError
            ? err
            : new OpenfortError(
                formatErrorWithReason('Transaction failed', err),
                OpenfortErrorCode.TRANSACTION_SIGNING_FAILED,
                { cause: err }
              )
        setError(wrapped)
      }
    },
    [wallet, rpc, rpcUrl, queryClient]
  )

  const isLoading = status === 'signing' || status === 'sending'
  const isError = status === 'error'
  const isSuccess = status === 'confirmed'

  return { sendTransaction, status, isLoading, isError, isSuccess, error, reset }
}
