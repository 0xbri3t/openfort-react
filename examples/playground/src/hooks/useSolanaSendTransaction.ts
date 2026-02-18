/**
 * Playground-only: send SOL via Openfort Solana embedded wallet.
 * Not part of SDK — use @solana/kit with embedded wallet provider in your app.
 */

import { OpenfortError, OpenfortErrorCode, useSolanaContext, useSolanaEmbeddedWallet } from '@openfort/react'
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
import { Buffer } from 'buffer'
import { useCallback, useMemo, useState } from 'react'
import { createTransferSolInstruction, toUint8Array, unwrapTransactionSignature } from './solanaTransfer'

export type SolanaSendTransactionStatus = 'idle' | 'signing' | 'sending' | 'confirmed' | 'error'

export type UseSolanaSendTransactionResult = {
  sendTransaction: (params: { to: string; amount: bigint }) => Promise<string | undefined>
  /** Alias for sendTransaction for component compatibility */
  sendSOL: (params: { to: string; lamports: bigint }) => Promise<string | undefined>
  data: string | undefined
  status: SolanaSendTransactionStatus
  isLoading: boolean
  isPending: boolean
  isError: boolean
  isSuccess: boolean
  error: OpenfortError | null
  reset: () => void
}

export function useSolanaSendTransaction(): UseSolanaSendTransactionResult {
  const { rpcUrl } = useSolanaContext()
  const rpc = useMemo(() => createSolanaRpc(rpcUrl), [rpcUrl])
  const wallet = useSolanaEmbeddedWallet()

  const [status, setStatus] = useState<SolanaSendTransactionStatus>('idle')
  const [lastSignature, setLastSignature] = useState<string | undefined>(undefined)
  const [error, setError] = useState<OpenfortError | null>(null)

  const reset = useCallback(() => {
    setStatus('idle')
    setLastSignature(undefined)
    setError(null)
  }, [])

  const sendTransaction = useCallback(
    async (params: { to: string; amount: bigint }) => {
      if (wallet.status !== 'connected' || !params.amount || params.amount <= BigInt(0)) {
        setError(new OpenfortError('Wallet not connected or invalid amount', OpenfortErrorCode.TRANSACTION_UNKNOWN))
        setStatus('error')
        return undefined
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
          setLastSignature(signatureValue)
          return signatureValue
        }
        setStatus('error')
        setError(new OpenfortError('Transaction failed', OpenfortErrorCode.TRANSACTION_RPC_ERROR))
        return undefined
      } catch (err) {
        setStatus('error')
        const wrapped =
          err instanceof OpenfortError
            ? err
            : new OpenfortError(
                String(err instanceof Error ? err.message : err),
                OpenfortErrorCode.TRANSACTION_SIGNING_FAILED,
                {
                  cause: err,
                }
              )
        setError(wrapped)
        return undefined
      }
    },
    [wallet, rpc]
  )

  const sendSOL = useCallback(
    (params: { to: string; lamports: bigint }) => sendTransaction({ to: params.to, amount: params.lamports }),
    [sendTransaction]
  )

  const isLoading = status === 'signing' || status === 'sending'
  const isPending = isLoading
  const isError = status === 'error'
  const isSuccess = status === 'confirmed'

  return {
    sendTransaction,
    sendSOL,
    data: lastSignature,
    status,
    isLoading,
    isPending,
    isError,
    isSuccess,
    error,
    reset,
  }
}
