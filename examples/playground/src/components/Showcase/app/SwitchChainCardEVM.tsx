import { useEthereumEmbeddedWallet, useOpenfort } from '@openfort/react'
import type { ReactNode } from 'react'
import { useState } from 'react'
import { numberToHex } from 'viem'
import { Button } from '@/components/Showcase/ui/Button'
import { InputMessage } from '@/components/Showcase/ui/InputMessage'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useEthereumAccount } from '@/hooks/useEthereumAdapterHooks'

const PLAYGROUND_CHAINS = [
  { id: 80002, name: 'Polygon Amoy' },
  { id: 84532, name: 'Base Sepolia' },
  { id: 13337, name: 'Beam Testnet' },
]

export const SwitchChainCardEVM = ({ tooltip }: { tooltip?: { hook: string; body: ReactNode } }) => {
  const embedded = useEthereumEmbeddedWallet()
  const { chainId: accountChainId, isConnected: hasAccount } = useEthereumAccount()
  const { setActiveChainId, ...core } = useOpenfort()
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [data, setData] = useState<{ id: number; name: string } | null>(null)

  const currentChainId =
    embedded.status === 'connected' ? embedded.chainId : (accountChainId ?? core.activeChainId ?? undefined)
  const canSwitch = hasAccount || embedded.status === 'connected' || !!core.activeEmbeddedAddress

  const switchChain = async (targetChainId: number) => {
    if (!canSwitch) {
      setError(new Error('Wallet not connected'))
      return
    }

    setIsPending(true)
    setError(null)
    setData(null)

    try {
      const provider =
        embedded.status === 'connected' && embedded.activeWallet
          ? await embedded.activeWallet.getProvider()
          : await core.client.embeddedWallet.getEthereumProvider()
      await provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: numberToHex(targetChainId) }],
      })

      setActiveChainId(targetChainId)
      const chain = PLAYGROUND_CHAINS.find((c) => c.id === targetChainId)
      setData(chain || { id: targetChainId, name: `Chain ${targetChainId}` })
    } catch (err) {
      const e = err instanceof Error ? err : new Error('Failed to switch chain')
      setError(e)
    } finally {
      setIsPending(false)
    }
  }

  const chainName =
    PLAYGROUND_CHAINS.find((chain) => chain.id === currentChainId)?.name ||
    (currentChainId != null ? `Chain ${currentChainId}` : 'Unknown')

  return (
    <Card>
      <CardHeader>
        <CardTitle>Switch chain</CardTitle>
        <CardDescription>Switch between different chains to interact with various blockchain networks.</CardDescription>
        <p className="text-sm text-muted-foreground">
          Current chain: {chainName}
          {currentChainId != null && ` (${currentChainId})`}
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
                        disabled={currentChainId === chain.id || isPending || !canSwitch}
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
                  disabled={currentChainId === chain.id || isPending || !canSwitch}
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
