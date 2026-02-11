import {
  ChainTypeEnum,
  getExplorerUrl,
  useSolanaAccount,
  useSolanaSendSOL,
  useSolanaSwitchCluster,
} from '@openfort/react'
import { useMemo } from 'react'
import { Button } from '@/components/Showcase/ui/Button'
import { InputMessage } from '@/components/Showcase/ui/InputMessage'
import { TruncatedText } from '@/components/TruncatedText'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/cn'

const LAMPORTS_PER_SOL = 1_000_000_000

function solToLamports(sol: number): bigint {
  return BigInt(Math.floor(sol * LAMPORTS_PER_SOL))
}

export const MintTokensCard = () => {
  const { address } = useSolanaAccount()
  const { sendSOL, data: txSignature, isPending, error, reset } = useSolanaSendSOL()
  const { currentCluster } = useSolanaSwitchCluster()

  const explorerUrl = useMemo(() => {
    if (!txSignature || !currentCluster) return null
    return getExplorerUrl(ChainTypeEnum.SVM, { txHash: txSignature, cluster: currentCluster })
  }, [txSignature, currentCluster])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!address) return
    const form = e.target as HTMLFormElement
    const amountSol = form.amount?.value || '0.001'
    const lamports = solToLamports(parseFloat(amountSol))
    if (lamports <= 0n) return
    sendSOL({ to: address, lamports })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mint tokens</CardTitle>
        <CardDescription>Mint devnet SOL to your wallet (self-transfer demo).</CardDescription>
        {address && (
          <CardDescription>
            Address: <TruncatedText text={address} />
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <form className="space-y-2" onSubmit={handleSubmit}>
          <label className={cn('input w-full')}>
            <input
              type="number"
              placeholder="Enter amount to mint (SOL)"
              className="grow peer placeholder:text-muted-foreground"
              name="amount"
              step="0.001"
              defaultValue="0.001"
            />
          </label>
          <Button className="btn btn-accent w-full" disabled={isPending || !address}>
            {isPending ? 'Minting...' : 'Mint Tokens'}
          </Button>
          <InputMessage
            message={txSignature ? `Tx: ${txSignature.slice(0, 12)}...` : ''}
            show={!!txSignature}
            variant="success"
          />
          {explorerUrl && (
            <a
              href={explorerUrl}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-green-600 dark:text-green-400 hover:underline"
            >
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
