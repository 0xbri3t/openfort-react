import { useSolanaSwitchCluster } from '@openfort/react'
import { Button } from '@/components/Showcase/ui/Button'
import { InputMessage } from '@/components/Showcase/ui/InputMessage'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export const SwitchClusterCardSolana = () => {
  const { currentCluster, switchCluster, clusters, error } = useSolanaSwitchCluster()

  return (
    <Card>
      <CardHeader>
        <CardTitle>Switch cluster</CardTitle>
        <CardDescription>Switch between Solana clusters (mainnet-beta, devnet, testnet).</CardDescription>
        <p className="text-sm text-muted-foreground">Current cluster: {currentCluster ?? '—'}</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {clusters.map((cluster) => (
            <div key={cluster}>
              <Button
                className="btn btn-accent"
                onClick={() => switchCluster(cluster)}
                disabled={currentCluster === cluster}
              >
                Switch to {cluster}
              </Button>
            </div>
          ))}
          <InputMessage message={error?.message ?? ''} show={!!error} variant="error" />
        </div>
      </CardContent>
    </Card>
  )
}
