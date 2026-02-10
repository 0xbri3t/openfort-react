import {
  ChainTypeEnum,
  getExplorerUrl,
  isValidSolanaAddress,
  useSolanaSendSOL,
  useSolanaSwitchCluster,
} from '@openfort/react'
import { useMemo, useState } from 'react'
import { Button } from '@/components/Showcase/ui/Button'
import { InputMessage } from '@/components/Showcase/ui/InputMessage'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/cn'

const LAMPORTS_PER_SOL = 1_000_000_000

function solToLamports(sol: number): bigint {
  return BigInt(Math.floor(sol * LAMPORTS_PER_SOL))
}

export const SendSOLCard = () => {
  const { sendSOL, data: txSignature, isPending, error, reset } = useSolanaSendSOL()
  const { currentCluster } = useSolanaSwitchCluster()
  const [recipient, setRecipient] = useState('')
  const [amountSol, setAmountSol] = useState('')

  const recipientValid = useMemo(() => recipient.length > 0 && isValidSolanaAddress(recipient), [recipient])
  const amountValid = useMemo(() => {
    const n = parseFloat(amountSol)
    return !Number.isNaN(n) && n > 0
  }, [amountSol])

  const explorerUrl = useMemo(() => {
    if (!txSignature || !currentCluster) return null
    return getExplorerUrl(ChainTypeEnum.SVM, { txHash: txSignature, cluster: currentCluster })
  }, [txSignature, currentCluster])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!recipientValid || !amountValid) return
    const lamports = solToLamports(parseFloat(amountSol))
    sendSOL({ to: recipient, lamports })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Send SOL</CardTitle>
        <CardDescription>Send native SOL to a Base58 recipient address. Amount in SOL (not lamports).</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-2" onSubmit={handleSubmit}>
          <label className={cn('input w-full')}>
            <input
              name="recipient"
              type="text"
              placeholder="Recipient (Base58)"
              className="grow peer"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
            />
          </label>
          <label className={cn('input w-full')}>
            <input
              name="amount"
              type="text"
              placeholder="Amount (SOL)"
              className="grow peer"
              value={amountSol}
              onChange={(e) => setAmountSol(e.target.value)}
            />
          </label>
          <Button className="btn btn-accent w-full" disabled={!recipientValid || !amountValid || isPending}>
            {isPending ? 'Sending...' : 'Send SOL'}
          </Button>
          <InputMessage
            message={txSignature ? `Tx: ${txSignature.slice(0, 12)}...` : ''}
            show={!!txSignature}
            variant="success"
          />
          {explorerUrl && (
            <a href={explorerUrl} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline">
              View on Explorer
            </a>
          )}
          <InputMessage message={error?.message ?? ''} show={!!error} variant="error" />
          {txSignature && (
            <Button type="button" className="btn btn-ghost btn-sm" onClick={reset}>
              Reset
            </Button>
          )}
        </form>
      </CardContent>
    </Card>
  )
}
