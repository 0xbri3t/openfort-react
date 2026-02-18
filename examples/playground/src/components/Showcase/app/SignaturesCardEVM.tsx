import { useEthereumEmbeddedWallet, useOpenfort } from '@openfort/react'
import type { ReactNode } from 'react'
import { useState } from 'react'
import { createWalletClient, custom } from 'viem'
import { Button } from '@/components/Showcase/ui/Button'
import { InputMessage } from '@/components/Showcase/ui/InputMessage'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useDisplayEthereumAddress } from '@/hooks/useConnectedEthereumAccount'
import { cn } from '@/lib/cn'

export const SignaturesCardEVM = ({ tooltip }: { tooltip?: { hook: string; body: ReactNode } }) => {
  const core = useOpenfort()
  const address = useDisplayEthereumAddress()
  const { status, activeWallet } = useEthereumEmbeddedWallet()
  const [data, setData] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const canSign = !!address

  const signMessage = async (params: { message: string }) => {
    if (!address) {
      setError(new Error('Wallet not connected'))
      return
    }

    setIsPending(true)
    setError(null)
    setData(null)

    try {
      const provider =
        status === 'connected' && activeWallet
          ? await activeWallet.getProvider()
          : await core.client.embeddedWallet.getEthereumProvider()

      const walletClient = createWalletClient({
        account: address,
        transport: custom(provider),
      })

      const signature = await walletClient.signMessage({
        account: address,
        message: params.message,
      })

      setData(signature)
    } catch (err) {
      const e = err instanceof Error ? err : new Error('Failed to sign message')
      setError(e)
    } finally {
      setIsPending(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Signatures</CardTitle>
        <CardDescription>
          Sign messages with your wallet to prove ownership and perform actions in the app.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault()
            const message = (e.target as HTMLFormElement).message.value
            signMessage({ message })
          }}
        >
          <label className={cn('input w-full')}>
            <input
              name="message"
              type="text"
              placeholder="Enter a message to sign"
              className="grow peer"
              defaultValue="Hello from Openfort!"
              disabled={isPending || !canSign}
            />
          </label>
          {tooltip ? (
            <Tooltip delayDuration={500}>
              <TooltipTrigger asChild>
                <div className="w-full">
                  <Button className="btn btn-accent w-full" disabled={isPending || !canSign}>
                    {isPending ? 'Signing...' : 'Sign a message'}
                  </Button>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top">
                <h3 className="text-base mb-1">{tooltip.hook}</h3>
                {tooltip.body}
              </TooltipContent>
            </Tooltip>
          ) : (
            <Button className="btn btn-accent w-full" disabled={isPending || !canSign}>
              {isPending ? 'Signing...' : 'Sign a message'}
            </Button>
          )}
          <InputMessage
            message={`Signed message: ${data?.slice(0, 10)}...${data?.slice(-10)}`}
            show={!!data}
            variant="success"
          />
          <InputMessage message={error?.message ?? ''} show={!!error} variant="error" />
        </form>
      </CardContent>
    </Card>
  )
}
