import { useSolanaBalanceAdapter, useSolanaSwitchCluster } from '@openfort/react'
import { Button } from '@/components/Showcase/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export const SolanaBalanceCard = () => {
  const { data, refetch, isLoading, error } = useSolanaBalanceAdapter()
  const { currentCluster } = useSolanaSwitchCluster()

  return (
    <Card>
      <CardHeader>
        <CardTitle>SOL balance</CardTitle>
        <CardDescription>Native SOL balance for the connected wallet. Refetch to update.</CardDescription>
        {currentCluster && <span className="text-xs rounded bg-muted px-2 py-0.5 font-medium">{currentCluster}</span>}
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {data && (
            <p className="text-lg font-medium">
              {data.formatted} {data.symbol}
            </p>
          )}
          {error && <p className="text-sm text-destructive">{error.message}</p>}
          <Button className="btn btn-accent" onClick={() => refetch()} disabled={isLoading}>
            Refetch
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
