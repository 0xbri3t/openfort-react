import { useSolanaSignMessage } from '@openfort/react'
import type { ReactNode } from 'react'
import { Button } from '@/components/Showcase/ui/Button'
import { InputMessage } from '@/components/Showcase/ui/InputMessage'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/cn'

export const SignaturesCardSolana = ({ tooltip }: { tooltip?: { hook: string; body: ReactNode } }) => {
  const { data, signMessage, isPending, error } = useSolanaSignMessage()

  const SignButton = () => (
    <Button className="btn btn-accent w-full" disabled={isPending}>
      {isPending ? 'Signing...' : 'Sign a message'}
    </Button>
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>Signatures</CardTitle>
        <CardDescription>Sign messages with your Solana wallet (Ed25519). Signature is base58.</CardDescription>
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
            message={data ? `Signature: ${data.slice(0, 12)}...${data.slice(-8)}` : ''}
            show={!!data}
            variant="success"
          />
          <InputMessage message={error?.message ?? ''} show={!!error} variant="error" />
        </form>
      </CardContent>
    </Card>
  )
}
