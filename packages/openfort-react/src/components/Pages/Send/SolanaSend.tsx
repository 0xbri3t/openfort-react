import {
  address,
  appendTransactionMessageInstruction,
  compileTransaction,
  createSolanaRpc,
  createTransactionMessage,
  getBase58Encoder,
  getBase64EncodedWireTransaction,
  pipe,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
} from '@solana/kit'
import { useCallback, useEffect, useState } from 'react'
import { OpenfortError, OpenfortReactErrorType } from '../../../core/errors'
import { invalidateBalance } from '../../../hooks/useBalance'
import { useAsyncData } from '../../../shared/hooks/useAsyncData'
import { isValidSolanaAddress } from '../../../shared/utils/validation'
import { FEE_LAMPORTS, LAMPORTS_PER_SOL, RENT_EXEMPT_MINIMUM_SOL } from '../../../solana/constants'
import { useSolanaEmbeddedWallet } from '../../../solana/hooks/useSolanaEmbeddedWallet'
import { solToLamports } from '../../../solana/hooks/utils'
import { useSolanaContext } from '../../../solana/SolanaContext'
import { createTransferSolInstruction } from '../../../solana/utils/transfer'
import { logger } from '../../../utils/logger'
import Button from '../../Common/Button'
import Input from '../../Common/Input'
import Loader from '../../Common/Loading'
import { ModalHeading } from '../../Common/Modal/styles'
import { routes } from '../../Openfort/types'
import { useOpenfort } from '../../Openfort/useOpenfort'
import { PageContent } from '../../PageContent'
import { AmountInputWrapper, ErrorText, Field, FieldLabel, Form, HelperText, MaxButton } from './styles'
import { sanitizeAmountInput } from './utils'

async function fetchSolanaBalance(rpcUrl: string, addr: string): Promise<number> {
  const response = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'getBalance',
      params: [addr, { commitment: 'confirmed' }],
    }),
  })
  const data = await response.json()
  return data.result?.value ?? 0
}

function formatSol(lamports: bigint, decimals = 4): string {
  return (Number(lamports) / Number(LAMPORTS_PER_SOL)).toFixed(decimals)
}

const ED25519_SIGNATURE_LENGTH = 64

/** Decode provider signature (base58 from Openfort) to 64-byte Ed25519 Uint8Array. */
function decodeSignatureToBytes(signature: string): Uint8Array {
  const encoded = getBase58Encoder().encode(signature)
  let bytes = new Uint8Array(encoded)
  // Openfort may return 65 bytes (recovery byte appended); strip to Ed25519's 64
  if (bytes.length === ED25519_SIGNATURE_LENGTH + 1) {
    bytes = bytes.slice(0, ED25519_SIGNATURE_LENGTH)
  }
  if (bytes.length === ED25519_SIGNATURE_LENGTH) return bytes
  throw new OpenfortError(
    `Invalid signature: expected ${ED25519_SIGNATURE_LENGTH} bytes, got ${bytes.length}.`,
    OpenfortReactErrorType.CONFIGURATION_ERROR
  )
}

export function SolanaSend() {
  const { rpcUrl } = useSolanaContext()
  const { setRoute } = useOpenfort()
  const wallet = useSolanaEmbeddedWallet()
  const [recipient, setRecipient] = useState('')
  const [amount, setAmount] = useState('')
  const [txStatus, setTxStatus] = useState<'idle' | 'signing' | 'sending' | 'confirmed' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [confirmedAmount, setConfirmedAmount] = useState('')

  const walletAddress = wallet.status === 'connected' ? wallet.activeWallet.address : undefined
  const provider = wallet.status === 'connected' ? wallet.provider : null

  const balanceResult = useAsyncData({
    queryKey: ['solana-balance', walletAddress, rpcUrl],
    queryFn: async () => {
      if (!walletAddress || !rpcUrl) return null
      try {
        const balanceLamports = await fetchSolanaBalance(rpcUrl, walletAddress)
        return { value: BigInt(balanceLamports) }
      } catch (error) {
        logger.error('Failed to fetch Solana balance:', error)
        return null
      }
    },
    enabled: Boolean(walletAddress && rpcUrl),
  })

  const balanceData = balanceResult.data

  const balanceLamports = balanceData?.value ?? BigInt(0)
  const recipientValid = recipient.length > 0 && isValidSolanaAddress(recipient)

  const amountNum = amount === '' || amount === '.' ? null : parseFloat(amount)
  const amountLamports =
    amountNum !== null && !Number.isNaN(amountNum) && amountNum > 0 ? solToLamports(amountNum) : null
  const insufficientBalance =
    amountLamports !== null && balanceLamports !== undefined ? amountLamports > balanceLamports : false
  const belowRentExempt =
    amountLamports !== null && balanceLamports !== undefined
      ? balanceLamports - amountLamports < BigInt(Math.ceil(RENT_EXEMPT_MINIMUM_SOL * 1e9))
      : false
  const hasAmount = amountLamports !== null && amountLamports > BigInt(0)
  const amountValid = hasAmount && !insufficientBalance && !belowRentExempt

  const maxLamports =
    balanceLamports > FEE_LAMPORTS
      ? balanceLamports - FEE_LAMPORTS - BigInt(Math.ceil(RENT_EXEMPT_MINIMUM_SOL * 1e9))
      : BigInt(0)
  const maxLamportsSafe = maxLamports > BigInt(0) ? maxLamports : BigInt(0)

  const canProceed = recipientValid && amountValid && provider && txStatus === 'idle'

  const handleMax = useCallback(() => {
    if (maxLamportsSafe <= BigInt(0)) return
    setAmount(formatSol(maxLamportsSafe, 9))
  }, [maxLamportsSafe])

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      if (!canProceed || !provider || !walletAddress || !amountLamports || amountLamports <= BigInt(0)) return

      setErrorMessage(null)
      setTxStatus('signing')

      try {
        const rpc = createSolanaRpc(rpcUrl)
        const { value: blockhash } = await rpc.getLatestBlockhash().send()
        const fromAddress = address(walletAddress)
        const transferInstruction = createTransferSolInstruction(walletAddress, recipient, amountLamports)

        const message = pipe(
          createTransactionMessage({ version: 0 }),
          (msg) => setTransactionMessageFeePayer(fromAddress, msg),
          (msg) => setTransactionMessageLifetimeUsingBlockhash(blockhash, msg),
          (msg) => appendTransactionMessageInstruction(transferInstruction, msg)
        )

        const compiled = compileTransaction(message)

        const signed = await provider.signTransaction({ messageBytes: compiled.messageBytes } as any)

        const signatureBytes = decodeSignatureToBytes(signed.signature)

        const signedTransaction = {
          messageBytes: compiled.messageBytes,
          signatures: { ...compiled.signatures, [fromAddress]: signatureBytes } as typeof compiled.signatures,
        }

        const encodedWire = getBase64EncodedWireTransaction(signedTransaction)

        setTxStatus('sending')

        await rpc
          .sendTransaction(encodedWire, {
            encoding: 'base64',
            preflightCommitment: 'confirmed',
            skipPreflight: false,
          })
          .send()

        setConfirmedAmount(amount)
        setTxStatus('confirmed')
        setRecipient('')
        setAmount('')
      } catch (err: unknown) {
        setTxStatus('error')
        const msg = err instanceof OpenfortError ? err.message : err instanceof Error ? err.message : String(err)
        setErrorMessage(msg || 'Transaction failed')
      }
    },
    [canProceed, provider, walletAddress, amountLamports, recipient, rpcUrl]
  )

  useEffect(() => {
    if (txStatus !== 'confirmed') return
    const timer = setTimeout(() => {
      invalidateBalance()
      setRoute(routes.SOL_CONNECTED)
    }, 2400)
    return () => clearTimeout(timer)
  }, [txStatus, setRoute])

  const availableLabel = balanceLamports !== undefined ? formatSol(balanceLamports) : '--'

  if (txStatus === 'confirmed') {
    return (
      <PageContent onBack={routes.SOL_CONNECTED}>
        <Loader isSuccess header="Transfer Sent" description={`${confirmedAmount} SOL sent successfully`} />
      </PageContent>
    )
  }

  return (
    <PageContent onBack={routes.SOL_CONNECTED}>
      <ModalHeading>Send SOL</ModalHeading>
      <Form onSubmit={handleSubmit}>
        <Field>
          <FieldLabel>Amount</FieldLabel>
          <AmountInputWrapper>
            <Input
              placeholder="0.00"
              value={amount}
              onChange={(e) => {
                const raw = sanitizeAmountInput(e.target.value)
                if (raw === '' || /^[0-9]*\.?[0-9]*$/.test(raw)) setAmount(raw)
              }}
              inputMode="decimal"
              autoComplete="off"
              style={{ paddingRight: '86px' }}
            />
            <MaxButton type="button" onClick={handleMax} disabled={maxLamportsSafe <= BigInt(0)}>
              Max
            </MaxButton>
          </AmountInputWrapper>
          <HelperText>Available: {availableLabel} SOL</HelperText>
          {amount && amountNum !== null && Number.isNaN(amountNum) && <ErrorText>Enter a valid amount.</ErrorText>}
          {insufficientBalance && <ErrorText>Insufficient balance for this transfer.</ErrorText>}
          {belowRentExempt && <ErrorText>Leave enough for rent-exempt minimum (~0.00089 SOL).</ErrorText>}
        </Field>

        <Field>
          <FieldLabel>Recipient address</FieldLabel>
          <Input
            placeholder="Base58 address..."
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            autoComplete="off"
          />
          {recipient && !recipientValid && <ErrorText>Enter a valid Solana address.</ErrorText>}
        </Field>

        {txStatus === 'error' && errorMessage && (
          <Field>
            <ErrorText>{errorMessage}</ErrorText>
          </Field>
        )}

        <Button variant="primary" disabled={!canProceed} type="submit">
          {txStatus === 'idle' && 'Send SOL'}
          {txStatus === 'signing' && 'Signing...'}
          {txStatus === 'sending' && 'Sending...'}
          {txStatus === 'error' && 'Try again'}
        </Button>
      </Form>
    </PageContent>
  )
}
