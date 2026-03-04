import { ChainTypeEnum, useSolanaEmbeddedWallet } from '@openfort/react'
import { RefreshCw } from 'lucide-react'
import type { ReactNode } from 'react'
import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useAsyncData } from '@/hooks/useAsyncData'
import { cn } from '@/lib/cn'
import { getExplorerUrl } from '@/lib/explorer'
import { getTransactionHistory } from '@/lib/solana'

const COLLAPSED_COUNT = 4

export const TransactionHistoryCardSolana = ({ tooltip }: { tooltip?: { hook: string; body: ReactNode } }) => {
  const { address, cluster } = useSolanaEmbeddedWallet()
  const [showAll, setShowAll] = useState(false)

  const historyResult = useAsyncData({
    queryKey: ['solana-tx-history', address],
    queryFn: () => (address ? getTransactionHistory(address, 20) : Promise.resolve([])),
    enabled: Boolean(address),
  })

  const transactions = historyResult.data ?? []
  const visible = showAll ? transactions : transactions.slice(0, COLLAPSED_COUNT)
  const hasMore = transactions.length > COLLAPSED_COUNT

  const formatTime = (blockTime: number | null) => {
    if (!blockTime) return '--'
    return new Date(blockTime * 1000).toLocaleString()
  }

  const cardContent = (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Transaction History</CardTitle>
            <CardDescription>Recent transactions for your Solana wallet.</CardDescription>
          </div>
          <button
            type="button"
            onClick={() => historyResult.refetch()}
            className="inline-flex size-8 items-center justify-center rounded hover:bg-muted transition-colors"
            aria-label="Refresh"
          >
            <RefreshCw className={cn('size-4 text-muted-foreground', historyResult.isLoading && 'animate-spin')} />
          </button>
        </div>
      </CardHeader>
      <CardContent>
        {historyResult.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : transactions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No transactions found.</p>
        ) : (
          <div className="space-y-2">
            {visible.map((tx) => {
              const explorerUrl = cluster ? getExplorerUrl(ChainTypeEnum.SVM, { txHash: tx.signature, cluster }) : null
              const isError = tx.err != null
              return (
                <div
                  key={tx.signature}
                  className="flex items-center justify-between text-sm border-b pb-2 last:border-0"
                >
                  <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                    <span className="font-mono text-xs truncate">
                      {explorerUrl ? (
                        <a href={explorerUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                          {tx.signature.slice(0, 20)}...
                        </a>
                      ) : (
                        `${tx.signature.slice(0, 20)}...`
                      )}
                    </span>
                    <span className="text-xs text-muted-foreground">{formatTime(tx.blockTime)}</span>
                  </div>
                  <span
                    className={cn(
                      'text-xs font-medium px-2 py-0.5 rounded-full',
                      isError
                        ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    )}
                  >
                    {isError ? 'Failed' : 'Success'}
                  </span>
                </div>
              )
            })}
            {hasMore && (
              <button
                type="button"
                onClick={() => setShowAll((v) => !v)}
                className="text-sm text-primary hover:underline w-full text-center pt-1"
              >
                {showAll ? 'Show less' : `Show more (${transactions.length - COLLAPSED_COUNT})`}
              </button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )

  if (tooltip) {
    return (
      <Tooltip delayDuration={500}>
        <TooltipTrigger asChild>{cardContent}</TooltipTrigger>
        <TooltipContent side="top">
          <h3 className="text-base mb-1">{tooltip.hook}</h3>
          {tooltip.body}
        </TooltipContent>
      </Tooltip>
    )
  }

  return cardContent
}
