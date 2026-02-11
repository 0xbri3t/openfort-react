import { useSVMSwitchCluster } from '@openfort/react'
import type { ReactNode } from 'react'
import { Button } from '@/components/Showcase/ui/Button'
import { InputMessage } from '@/components/Showcase/ui/InputMessage'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

export const SwitchClusterCardSolana = ({ tooltip }: { tooltip?: { hook: string; body: ReactNode } }) => {
  const { currentCluster, switchCluster, clusters, error } = useSVMSwitchCluster()

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
              {tooltip ? (
                <Tooltip delayDuration={500}>
                  <TooltipTrigger asChild>
                    <div>
                      <Button
                        className="btn btn-accent"
                        onClick={() => switchCluster(cluster)}
                        disabled={currentCluster === cluster}
                      >
                        Switch to {cluster}
                      </Button>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <h3 className="text-base mb-1">{tooltip.hook}</h3>
                    {tooltip.body}
                  </TooltipContent>
                </Tooltip>
              ) : (
                <Button
                  className="btn btn-accent"
                  onClick={() => switchCluster(cluster)}
                  disabled={currentCluster === cluster}
                >
                  Switch to {cluster}
                </Button>
              )}
            </div>
          ))}
          <InputMessage message={error?.message ?? ''} show={!!error} variant="error" />
        </div>
      </CardContent>
    </Card>
  )
}
