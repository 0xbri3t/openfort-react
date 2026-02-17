import { useEthereumEmbeddedWallet } from '@openfort/react'
import type { ReactNode } from 'react'
import { useState } from 'react'
import { numberToHex } from 'viem'
import { Button } from '@/components/Showcase/ui/Button'
import { InputMessage } from '@/components/Showcase/ui/InputMessage'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

const PLAYGROUND_CHAINS = [
  { id: 80002, name: 'Polygon Amoy' },
  { id: 84532, name: 'Base Sepolia' },
  { id: 13337, name: 'Beam Testnet' },
]

export const SwitchChainCardEVM = ({ tooltip }: { tooltip?: { hook: string; body: ReactNode } }) => {
  const { chainId: currentChainId, status, activeWallet } = useEthereumEmbeddedWallet()
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [data, setData] = useState<{ id: number; name: string } | null>(null)

  const switchChain = async (targetChainId: number) => {
    if (status !== 'connected' || !activeWallet) {
      setError(new Error('Wallet not connected'))
      return
    }

    setIsPending(true)
    setError(null)
    setData(null)

    try {
      const provider = await activeWallet.getProvider()
      await provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: numberToHex(targetChainId) }],
      })

      const chain = PLAYGROUND_CHAINS.find((c) => c.id === targetChainId)
      setData(chain || { id: targetChainId, name: `Chain ${targetChainId}` })
    } catch (err) {
      const e = err instanceof Error ? err : new Error('Failed to switch chain')
      setError(e)
    } finally {
      setIsPending(false)
    }
  }

  const chainName = PLAYGROUND_CHAINS.find((chain) => chain.id === currentChainId)?.name || 'Unknown'

  return (
    <Card>
      <CardHeader>
        <CardTitle>Switch chain</CardTitle>
        <CardDescription>Switch between different chains to interact with various blockchain networks.</CardDescription>
        <p className="text-sm text-muted-foreground">
          Current chain: {chainName} ({currentChainId})
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {PLAYGROUND_CHAINS.map((chain) => (
            <div key={chain.id}>
              {tooltip ? (
                <Tooltip delayDuration={500}>
                  <TooltipTrigger asChild>
                    <div>
                      <Button
                        className="btn btn-accent"
                        onClick={() => switchChain(chain.id)}
                        disabled={currentChainId === chain.id || isPending || status !== 'connected'}
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
                  onClick={() => switchChain(chain.id)}
                  disabled={currentChainId === chain.id || isPending || status !== 'connected'}
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
