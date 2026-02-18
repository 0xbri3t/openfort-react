import { useEthereumEmbeddedWallet, useOpenfort } from '@openfort/react'
import type { ReactNode } from 'react'
import { useState } from 'react'
import { createWalletClient, custom } from 'viem'
import { useAccount, useSignMessage } from 'wagmi'
import { Button } from '@/components/Showcase/ui/Button'
import { InputMessage } from '@/components/Showcase/ui/InputMessage'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useConnectedEthereumAccount } from '@/hooks/useConnectedEthereumAccount'
import { cn } from '@/lib/cn'

export const SignaturesCard = ({ tooltip }: { tooltip?: { hook: string; body: ReactNode } }) => {
  const { address } = useConnectedEthereumAccount()
  const { isConnected } = useAccount()
  const {
    data: wagmiData,
    signMessage: wagmiSignMessage,
    isPending: wagmiPending,
    error: wagmiErrorObj,
  } = useSignMessage()

  const core = useOpenfort()
  const embedded = useEthereumEmbeddedWallet()
  const [localSignature, setLocalSignature] = useState<string | null>(null)
  const [localError, setLocalError] = useState<Error | null>(null)
  const [localPending, setLocalPending] = useState(false)

  const useWagmiSign = isConnected
  const isPending = useWagmiSign ? wagmiPending : localPending
  const signature = useWagmiSign ? wagmiData : localSignature
  const error = useWagmiSign ? wagmiErrorObj : localError

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const message = (e.currentTarget.message.value as string) || ''
    if (!address) return

    if (useWagmiSign) {
      wagmiSignMessage({ message })
      return
    }

    setLocalPending(true)
    setLocalError(null)
    setLocalSignature(null)
    try {
      const provider =
        embedded.status === 'connected' && embedded.activeWallet
          ? await embedded.activeWallet.getProvider()
          : await core.client.embeddedWallet.getEthereumProvider()

      const walletClient = createWalletClient({
        account: address,
        transport: custom(provider),
      })
      const sig = await walletClient.signMessage({
        account: address,
        message,
      })
      setLocalSignature(sig)
    } catch (err) {
      setLocalError(err instanceof Error ? err : new Error('Failed to sign message'))
    } finally {
      setLocalPending(false)
    }
  }

  const SignButton = () => (
    <Button className="btn btn-accent w-full" disabled={isPending || !address}>
      {isPending ? 'Signing...' : 'Sign a message'}
    </Button>
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>Signatures</CardTitle>
        <CardDescription>
          Sign messages with your wallet to prove ownership and perform actions in the app.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-2" onSubmit={handleSubmit}>
          <label className={cn('input w-full')}>
            <input
              name="message"
              type="text"
              placeholder="Enter a message to sign"
              className="grow peer"
              defaultValue="Hello from Openfort!"
              disabled={!address}
            />
          </label>
          {tooltip ? (
            <Tooltip delayDuration={500}>
              <TooltipTrigger asChild>
                <div className="w-full">
                  <SignButton />
                </div>
              </TooltipTrigger>
              <TooltipContent side="top">
                <h3 className="text-base mb-1">{tooltip.hook}</h3>
                {tooltip.body}
              </TooltipContent>
            </Tooltip>
          ) : (
            <SignButton />
          )}
          <InputMessage
            message={`Signed message: ${signature?.slice(0, 10)}...${signature?.slice(-10)}`}
            show={!!signature}
            variant="success"
          />
          <InputMessage message={error?.message ?? 'Connect a wallet to sign.'} show={!!error} variant="error" />
        </form>
      </CardContent>
    </Card>
  )
}
