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
import { useCallback, useState } from 'react'
import { OpenfortError } from '../../../core/errors'
import { isValidSolanaAddress } from '../../../shared/utils/validation'
import { FEE_LAMPORTS, LAMPORTS_PER_SOL, RENT_EXEMPT_MINIMUM_SOL } from '../../../solana/constants'
import { useSolanaBalance } from '../../../solana/hooks/useSolanaBalance'
import { useSolanaEmbeddedWallet } from '../../../solana/hooks/useSolanaEmbeddedWallet'
import { solToLamports } from '../../../solana/hooks/utils'
import { useSolanaContext } from '../../../solana/SolanaContext'
import { createTransferSolInstruction } from '../../../solana/utils/transfer'
import Button from '../../Common/Button'
import Input from '../../Common/Input'
import { ModalHeading } from '../../Common/Modal/styles'
import { routes } from '../../Openfort/types'
import { PageContent } from '../../PageContent'
import { AmountInputWrapper, ErrorText, Field, FieldLabel, Form, HelperText, MaxButton } from './styles'
import { sanitizeAmountInput } from './utils'

function formatSol(lamports: bigint, decimals = 4): string {
  return (Number(lamports) / Number(LAMPORTS_PER_SOL)).toFixed(decimals)
}

export function SolanaSend() {
  const { rpcUrl } = useSolanaContext()
  const wallet = useSolanaEmbeddedWallet()
  const [recipient, setRecipient] = useState('')
  const [amount, setAmount] = useState('')
  const [txStatus, setTxStatus] = useState<'idle' | 'signing' | 'sending' | 'confirmed' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const walletAddress = wallet.status === 'connected' ? wallet.activeWallet.address : undefined
  const provider = wallet.status === 'connected' ? wallet.provider : null

  const balanceResult = useSolanaBalance(walletAddress ? { address: walletAddress } : undefined)
  const balanceData = balanceResult.data
  const refetchBalance = balanceResult.refetch

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
        const { lastValidBlockHeight: _lastValidBlockHeight } = blockhash

        const fromAddress = address(walletAddress)
        const transferInstruction = createTransferSolInstruction(walletAddress, recipient, amountLamports)

        const message = pipe(
          createTransactionMessage({ version: 0 }),
          (msg) => setTransactionMessageFeePayer(fromAddress, msg),
          (msg) => setTransactionMessageLifetimeUsingBlockhash(blockhash, msg),
          (msg) => appendTransactionMessageInstruction(transferInstruction, msg)
        )

        const compiled = compileTransaction(message)
        // @solana/kit compiled type vs our SolanaTransaction — bridge until types aligned (ethereum-only build)
        const signed = await provider.signTransaction({ messageBytes: compiled as any })

        setTxStatus('sending')

        // @solana/kit sendTransaction expects Base64EncodedWireTransaction — bridge until types aligned (ethereum-only build)
        const signature = await rpc
          .sendTransaction(new Uint8Array(Buffer.from(signed.signature, 'base64')) as any, {
            encoding: 'base64',
            preflightCommitment: 'confirmed',
            skipPreflight: false,
          })
          .send()

        // Signature from @solana/kit may be branded string — bridge until types aligned (ethereum-only build)
        if ((signature as any)?.value ?? signature) {
          setTxStatus('confirmed')
          refetchBalance()
        } else {
          setTxStatus('error')
          setErrorMessage('Transaction failed')
        }
      } catch (err) {
        setTxStatus('error')
        setErrorMessage(err instanceof OpenfortError ? err.message : 'Transaction failed')
      }
    },
    [canProceed, provider, walletAddress, amountLamports, recipient, rpcUrl, refetchBalance]
  )

  const availableLabel = balanceLamports !== undefined ? formatSol(balanceLamports) : '--'

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

        {txStatus === 'confirmed' && (
          <Field>
            <HelperText>Transfer sent successfully.</HelperText>
          </Field>
        )}

        <Button variant="primary" disabled={!canProceed} type="submit">
          {txStatus === 'idle' && 'Send SOL'}
          {txStatus === 'signing' && 'Signing...'}
          {txStatus === 'sending' && 'Sending...'}
          {txStatus === 'confirmed' && 'Done'}
          {txStatus === 'error' && 'Try again'}
        </Button>
      </Form>
    </PageContent>
  )
}
