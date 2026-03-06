'use client'

/**
 * Solana Send Confirmation Page
 *
 * Review page for SOL transfer (mirrors Ethereum SendConfirmation).
 * Shows: From, To, Amount, Fee (or Sponsored).
 */

import { ChainTypeEnum } from '@openfort/openfort-js'
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
import { useCallback, useEffect, useRef, useState } from 'react'
import { TickIcon } from '../../../assets/icons'
import { OpenfortError, OpenfortReactErrorType } from '../../../core/errors'
import { invalidateBalance } from '../../../hooks/useBalance'
import { getExplorerUrl } from '../../../shared/utils/explorer'
import { BASE_FEE_LAMPORTS } from '../../../solana/constants'
import { useSolanaEmbeddedWallet } from '../../../solana/hooks/useSolanaEmbeddedWallet'
import { formatSol, solToLamports } from '../../../solana/hooks/utils'
import { useSolanaContext } from '../../../solana/SolanaContext'
import { createTransferSolInstruction } from '../../../solana/utils/transfer'
import { truncateSolanaAddress } from '../../../utils'
import Button from '../../Common/Button'
import { CopyText } from '../../Common/CopyToClipboard/CopyText'
import Loader from '../../Common/Loading'
import { ModalBody, ModalHeading } from '../../Common/Modal/styles'
import { routes } from '../../Openfort/types'
import { useOpenfort } from '../../Openfort/useOpenfort'
import { PageContent } from '../../PageContent'
import { sanitizeForParsing } from '../Send/utils'
import {
  AddressValue,
  AmountValue,
  ButtonRow,
  CheckIconWrapper,
  ErrorContainer,
  ErrorMessage,
  ErrorTitle,
  FeesValue,
  SummaryItem,
  SummaryLabel,
  SummaryList,
} from '../SendConfirmation/styles'

const CONFIRM_POLL_MS = 500
const CONFIRM_TIMEOUT_MS = 60_000

async function waitForConfirmation(rpcUrl: string, signature: string): Promise<void> {
  const deadline = Date.now() + CONFIRM_TIMEOUT_MS
  while (Date.now() < deadline) {
    const res = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getSignatureStatuses',
        params: [[signature], { searchTransactionHistory: true }],
      }),
    })
    const data = await res.json()
    const status = data.result?.value?.[0]
    if (status?.err) throw new Error(typeof status.err === 'object' ? JSON.stringify(status.err) : String(status.err))
    if (status?.confirmationStatus === 'confirmed' || status?.confirmationStatus === 'finalized') return
    await new Promise((r) => setTimeout(r, CONFIRM_POLL_MS))
  }
  throw new OpenfortError('Transaction confirmation timed out', OpenfortReactErrorType.UNEXPECTED_ERROR)
}

const ED25519_SIGNATURE_LENGTH = 64

function decodeSignatureToBytes(signature: string): Uint8Array {
  const encoded = getBase58Encoder().encode(signature)
  let bytes = new Uint8Array(encoded)
  if (bytes.length === ED25519_SIGNATURE_LENGTH + 1) {
    bytes = bytes.slice(0, ED25519_SIGNATURE_LENGTH)
  }
  if (bytes.length === ED25519_SIGNATURE_LENGTH) return bytes
  throw new OpenfortError(
    `Invalid signature: expected ${ED25519_SIGNATURE_LENGTH} bytes, got ${bytes.length}.`,
    OpenfortReactErrorType.CONFIGURATION_ERROR
  )
}

export default function SolanaSendConfirmation() {
  const { rpcUrl, cluster } = useSolanaContext()
  const { sendForm, setRoute, triggerResize } = useOpenfort()
  const wallet = useSolanaEmbeddedWallet()

  const walletAddress = wallet.status === 'connected' ? wallet.activeWallet?.address : undefined
  const provider = wallet.status === 'connected' ? wallet.provider : null

  const [txStatus, setTxStatus] = useState<'idle' | 'signing' | 'sending' | 'confirmed' | 'error'>('idle')
  const [txSignature, setTxSignature] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const confirmAbortRef = useRef<AbortController | null>(null)

  const normalisedAmount = sanitizeForParsing(sendForm.amount)
  const parsedAmount =
    normalisedAmount && !Number.isNaN(parseFloat(normalisedAmount)) && parseFloat(normalisedAmount) > 0
      ? solToLamports(parseFloat(normalisedAmount))
      : null

  const recipient = sendForm.recipient.trim()

  const isSponsored = false

  const canProceed =
    !!provider &&
    !!walletAddress &&
    !!recipient &&
    parsedAmount !== null &&
    parsedAmount > BigInt(0) &&
    txStatus === 'idle'

  const handleConfirm = useCallback(async () => {
    if (!canProceed || !provider || !walletAddress || !parsedAmount || parsedAmount <= BigInt(0)) return

    setErrorMessage(null)
    setTxStatus('signing')

    try {
      const rpc = createSolanaRpc(rpcUrl)
      const { value: blockhash } = await rpc.getLatestBlockhash().send()
      const fromAddress = address(walletAddress)
      const transferInstruction = createTransferSolInstruction(walletAddress, recipient, parsedAmount)

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

      confirmAbortRef.current?.abort()
      const confirmController = new AbortController()
      confirmAbortRef.current = confirmController
      await waitForConfirmation(rpcUrl, signed.signature)

      setTxSignature(signed.signature)
      setTxStatus('confirmed')
      invalidateBalance()
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      setTxStatus('error')
      const msg = err instanceof OpenfortError ? err.message : err instanceof Error ? err.message : String(err)
      setErrorMessage(msg || 'Transaction failed')
    }
  }, [canProceed, provider, walletAddress, parsedAmount, recipient, rpcUrl])

  useEffect(() => {
    return () => {
      confirmAbortRef.current?.abort()
    }
  }, [])

  useEffect(() => {
    setTimeout(triggerResize, 10)
  }, [txStatus, errorMessage, triggerResize])

  const feeDisplay = isSponsored ? 'Sponsored' : `~${formatSol(BASE_FEE_LAMPORTS, 6)} SOL`

  const explorerUrl =
    txSignature && cluster ? getExplorerUrl(ChainTypeEnum.SVM, { txHash: txSignature, cluster }) : undefined

  const handleOpenBlockExplorer = () => {
    if (explorerUrl) window.open(explorerUrl, '_blank', 'noopener,noreferrer')
  }

  if (txStatus === 'confirmed') {
    return (
      <PageContent onBack={routes.SOL_CONNECTED}>
        <Loader isSuccess header="Transfer Sent" description={`${normalisedAmount || '0'} SOL sent successfully`} />
        <ButtonRow>
          <Button variant="primary" onClick={handleOpenBlockExplorer}>
            View on Explorer
          </Button>
          <Button variant="secondary" onClick={() => setRoute(routes.SOL_CONNECTED)}>
            Back to profile
          </Button>
        </ButtonRow>
      </PageContent>
    )
  }

  return (
    <PageContent onBack={routes.SOL_SEND}>
      <ModalHeading>Confirm transfer</ModalHeading>
      <ModalBody>Review the transaction details before sending.</ModalBody>

      <SummaryList>
        <SummaryItem>
          <SummaryLabel>Sending</SummaryLabel>
          <AmountValue>{normalisedAmount || '0'} SOL</AmountValue>
        </SummaryItem>

        <SummaryItem>
          <SummaryLabel>From</SummaryLabel>
          <AddressValue>
            {walletAddress ? (
              <CopyText size="1rem" value={walletAddress}>
                {truncateSolanaAddress(walletAddress)}
              </CopyText>
            ) : (
              '--'
            )}
          </AddressValue>
        </SummaryItem>

        <SummaryItem>
          <SummaryLabel>To</SummaryLabel>
          <AddressValue>
            {recipient ? (
              <CopyText size="1rem" value={recipient}>
                {truncateSolanaAddress(recipient)}
              </CopyText>
            ) : (
              '--'
            )}
          </AddressValue>
        </SummaryItem>

        <SummaryItem>
          <SummaryLabel>Network fee</SummaryLabel>
          <FeesValue $completed={isSponsored}>
            {feeDisplay}
            <CheckIconWrapper>
              <TickIcon />
            </CheckIconWrapper>
          </FeesValue>
        </SummaryItem>
        {isSponsored && (
          <div
            style={{
              textAlign: 'end',
              marginTop: '4px',
              fontSize: '12px',
              color: 'var(--ck-body-color-valid)',
            }}
          >
            Sponsored transaction
          </div>
        )}
      </SummaryList>

      {errorMessage && (
        <ErrorContainer>
          <ErrorTitle>Transaction failed</ErrorTitle>
          <ErrorMessage>{errorMessage}</ErrorMessage>
        </ErrorContainer>
      )}

      <ButtonRow>
        <Button
          variant="primary"
          onClick={handleConfirm}
          disabled={!canProceed}
          waiting={txStatus === 'signing' || txStatus === 'sending'}
        >
          {txStatus === 'idle' && 'Confirm'}
          {txStatus === 'signing' && 'Signing...'}
          {txStatus === 'sending' && 'Sending...'}
          {txStatus === 'error' && 'Try again'}
        </Button>
        <Button variant="secondary" onClick={() => setRoute(routes.SOL_SEND)} disabled={txStatus !== 'idle'}>
          Cancel
        </Button>
      </ButtonRow>
    </PageContent>
  )
}
