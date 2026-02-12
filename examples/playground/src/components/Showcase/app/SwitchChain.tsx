import type { ReactNode } from 'react'
import { useChainId, useSwitchChain } from 'wagmi'
import { Button } from '@/components/Showcase/ui/Button'
import { InputMessage } from '@/components/Showcase/ui/InputMessage'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

export const SwitchChainCard = ({ tooltip }: { tooltip?: { hook: string; body: ReactNode } }) => {
  const { data, switchChain, chains, error, isPending } = useSwitchChain()
  const currentChain = useChainId()

  return (
    <Card>
      <CardHeader>
        <CardTitle>Switch chain</CardTitle>
        <CardDescription>Switch between different chains to interact with various blockchain networks.</CardDescription>
        <p className="text-sm text-muted-foreground">
          Current chain: {chains.find((chain) => chain.id === currentChain)?.name || 'Unknown'} ({currentChain})
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {chains.map((chain) => (
            <div key={chain.id}>
              {tooltip ? (
                <Tooltip delayDuration={500}>
                  <TooltipTrigger asChild>
                    <div>
                      <Button
                        className="btn btn-accent"
                        onClick={() => switchChain({ chainId: chain.id })}
                        disabled={currentChain === chain.id || isPending}
                      >
                        Switch to {chain.name}
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
                  onClick={() => switchChain({ chainId: chain.id })}
                  disabled={currentChain === chain.id || isPending}
                >
                  Switch to {chain.name}
                </Button>
              )}
            </div>
          ))}

          <InputMessage message={`Switched to chain ${data?.name}`} show={!!data} variant="success" />
          <InputMessage
            message={error?.message || 'An error occurred while switching chains.'}
            show={!!error}
            variant="error"
          />
        </div>
      </CardContent>
    </Card>
  )
}
