import { ChainTypeEnum, invalidateBalance, useSolanaEmbeddedWallet } from '@openfort/react'
import type { ReactNode } from 'react'
import { useState } from 'react'
import { Button } from '@/components/Showcase/ui/Button'
import { InputMessage } from '@/components/Showcase/ui/InputMessage'
import { TruncatedText } from '@/components/TruncatedText'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/cn'
import { getExplorerUrl } from '@/lib/explorer'

const LAMPORTS_PER_SOL = 1_000_000_000
const MAX_AIRDROP_SOL = 2 // devnet limit per request

const FAUCET_LINKS = [
  { href: 'https://faucet.solana.com', label: 'faucet.solana.com' },
  { href: 'https://faucet.quicknode.com/solana/devnet', label: 'QuickNode faucet' },
]

async function requestAirdrop(
  address: string,
  rpcUrl: string,
  lamports: number
): Promise<string | { error: string } | null> {
  const res = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'requestAirdrop',
      params: [address, lamports],
    }),
  })
  const data = await res.json()
  if (res.status === 429) {
    return { error: 'Rate limited. Use faucet.solana.com or set VITE_HELIUS_API_KEY in .env.local.' }
  }
  if (typeof data.result === 'string') return data.result
  const errMsg = data.error?.message ?? 'Airdrop failed'
  return { error: errMsg }
}

export const MintTokensCard = ({ tooltip }: { tooltip?: { hook: string; body: ReactNode } }) => {
  const { address, cluster, rpcUrl } = useSolanaEmbeddedWallet()
  const [isPending, setIsPending] = useState(false)
  const [txSignature, setTxSignature] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const defaultRpc = 'https://api.devnet.solana.com'
  const rpc = rpcUrl ?? defaultRpc

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!address) return
    const form = e.target as HTMLFormElement
    const amountSol = parseFloat(form.amount?.value || '1')
    if (!Number.isFinite(amountSol) || amountSol <= 0) return
    const capped = Math.min(amountSol, MAX_AIRDROP_SOL)
    const lamports = Math.floor(capped * LAMPORTS_PER_SOL)
    if (lamports <= 0) return

    setIsPending(true)
    setError(null)
    setTxSignature(null)
    requestAirdrop(address, rpc, lamports)
      .then((result) => {
        if (typeof result === 'string') {
          setTxSignature(result)
          invalidateBalance()
        } else if (result && typeof result === 'object' && 'error' in result) {
          setError(result.error)
        } else {
          setError(String(result ?? 'Airdrop failed'))
        }
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Airdrop failed')
      })
      .finally(() => setIsPending(false))
  }

  const explorerUrl =
    txSignature && cluster ? getExplorerUrl(ChainTypeEnum.SVM, { txHash: txSignature, cluster }) : null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mint tokens</CardTitle>
        <CardDescription>
          <a
            href="https://faucet.solana.com/"
            target="_blank"
            rel="noreferrer"
            className="text-primary hover:underline"
          >
            Fund your devnet account
          </a>
          . Enter amount (max {MAX_AIRDROP_SOL} SOL) and click Mint. For reliable minting, set VITE_HELIUS_API_KEY in
          .env.local or use a devnet RPC URL that supports airdrops.
        </CardDescription>
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
              min="0.001"
              max={MAX_AIRDROP_SOL}
              defaultValue="1"
            />
          </label>
          {tooltip ? (
            <Tooltip delayDuration={500}>
              <TooltipTrigger asChild>
                <div className="w-full">
                  <Button className="btn btn-accent w-full" disabled={isPending || !address}>
                    {isPending ? 'Minting...' : 'Mint Tokens'}
                  </Button>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top">
                <h3 className="text-base mb-1">{tooltip.hook}</h3>
                {tooltip.body}
              </TooltipContent>
            </Tooltip>
          ) : (
            <Button className="btn btn-accent w-full" disabled={isPending || !address}>
              {isPending ? 'Minting...' : 'Mint Tokens'}
            </Button>
          )}
          <InputMessage
            message={txSignature ? `Tx: ${txSignature.slice(0, 12)}...` : ''}
            show={!!txSignature}
            variant="success"
          />
          {explorerUrl && txSignature && (
            <a
              href={explorerUrl}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-green-600 dark:text-green-400 hover:underline"
            >
              View on Explorer
            </a>
          )}
          <InputMessage message={error ?? ''} show={!!error} variant="error" />
          {error && (
            <div className="mt-2 space-y-1 text-sm">
              <p className="text-muted-foreground">Get devnet SOL from:</p>
              <ul className="flex flex-wrap gap-2">
                {FAUCET_LINKS.map(({ href, label }) => (
                  <li key={href}>
                    <a href={href} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
              <p className="text-muted-foreground text-xs mt-1">
                For reliable minting, set VITE_HELIUS_API_KEY in .env.local or use a devnet RPC that supports airdrops.
              </p>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  )
}
