'use client'

import { useCallback } from 'react'
import { fetchSolanaBalance } from '../../../hooks/useBalance'
import { useAsyncData } from '../../../shared/hooks/useAsyncData'
import { isValidSolanaAddress } from '../../../shared/utils/validation'
import { BASE_FEE_LAMPORTS, RENT_EXEMPT_MINIMUM_LAMPORTS } from '../../../solana/constants'
import { useSolanaEmbeddedWallet } from '../../../solana/hooks/useSolanaEmbeddedWallet'
import { formatSol, solToLamports } from '../../../solana/hooks/utils'
import { useSolanaContext } from '../../../solana/SolanaContext'
import { logger } from '../../../utils/logger'
import Button from '../../Common/Button'
import Input from '../../Common/Input'
import { ModalHeading } from '../../Common/Modal/styles'
import type { SendFormState } from '../../Openfort/types'
import { routes } from '../../Openfort/types'
import { useOpenfort } from '../../Openfort/useOpenfort'
import { PageContent } from '../../PageContent'
import { AmountInputWrapper, ErrorText, Field, FieldLabel, Form, HelperText, MaxButton } from './styles'
import { sanitizeAmountInput, sanitizeForParsing } from './utils'

const RENT_EXEMPT_LAMPORTS = RENT_EXEMPT_MINIMUM_LAMPORTS

export function SolanaSend() {
  const { rpcUrl } = useSolanaContext()
  const { sendForm, setSendForm, setRoute } = useOpenfort()
  const wallet = useSolanaEmbeddedWallet()

  const recipient = sendForm.recipient
  const amount = sendForm.amount

  const walletAddress = wallet.status === 'connected' ? wallet.activeWallet?.address : undefined
  const provider = wallet.status === 'connected' ? wallet.provider : null

  const balanceResult = useAsyncData({
    queryKey: ['solana-balance', walletAddress, rpcUrl],
    queryFn: async () => {
      if (!walletAddress || !rpcUrl) return null
      try {
        const result = await fetchSolanaBalance(walletAddress, rpcUrl, 'confirmed')
        return { value: result.value }
      } catch (error) {
        logger.error('Failed to fetch Solana balance:', error)
        return null
      }
    },
    enabled: Boolean(walletAddress && rpcUrl),
  })

  const balanceLamports = balanceResult.data?.value ?? BigInt(0)
  const recipientValid = recipient.length > 0 && isValidSolanaAddress(recipient)

  const amountNum = amount === '' || amount === '.' ? null : parseFloat(amount)
  const amountLamports =
    amountNum !== null && !Number.isNaN(amountNum) && amountNum > 0 ? solToLamports(amountNum) : null
  const insufficientBalance =
    amountLamports !== null && balanceLamports !== undefined ? amountLamports > balanceLamports : false
  const belowRentExempt =
    amountLamports !== null && balanceLamports !== undefined
      ? balanceLamports - amountLamports < RENT_EXEMPT_LAMPORTS
      : false
  const hasAmount = amountLamports !== null && amountLamports > BigInt(0)
  const amountValid = hasAmount && !insufficientBalance && !belowRentExempt

  const maxLamports =
    balanceLamports > BASE_FEE_LAMPORTS ? balanceLamports - BASE_FEE_LAMPORTS - RENT_EXEMPT_LAMPORTS : BigInt(0)
  const maxLamportsSafe = maxLamports > BigInt(0) ? maxLamports : BigInt(0)

  const canProceed = recipientValid && amountValid && !!provider

  const handleMax = useCallback(() => {
    if (maxLamportsSafe <= BigInt(0)) return
    setSendForm((prev: SendFormState) => ({ ...prev, amount: formatSol(maxLamportsSafe, 9) }))
  }, [maxLamportsSafe, setSendForm])

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canProceed || !amountLamports || amountLamports <= BigInt(0)) return
    const normalized = sanitizeForParsing(amount)
    if (!normalized) return
    setSendForm((prev: SendFormState) => ({
      ...prev,
      amount: normalized,
      recipient,
      asset: prev.asset,
    }))
    setRoute(routes.SOL_SEND_CONFIRMATION)
  }

  const handleRecipientChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSendForm((prev) => ({ ...prev, recipient: e.target.value }))
  }

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = sanitizeAmountInput(e.target.value)
    if (raw === '' || /^[0-9]*\.?[0-9]*$/.test(raw)) {
      setSendForm((prev) => ({ ...prev, amount: raw }))
    }
  }

  const availableLabel = balanceResult.data != null ? formatSol(balanceLamports) : '--'

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
              onChange={handleAmountChange}
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
            onChange={handleRecipientChange}
            autoComplete="off"
          />
          {recipient && !recipientValid && <ErrorText>Enter a valid Solana address.</ErrorText>}
        </Field>

        <Button variant="primary" disabled={!canProceed} type="submit">
          Review transfer
        </Button>
      </Form>
    </PageContent>
  )
}
