import type { ReactNode } from 'react'
import { useSignMessage } from 'wagmi'
import { Button } from '@/components/Showcase/ui/Button'
import { InputMessage } from '@/components/Showcase/ui/InputMessage'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/cn'

export const SignaturesCard = ({ tooltip }: { tooltip?: { hook: string; body: ReactNode } }) => {
  const { data, signMessage } = useSignMessage()

  const SignButton = () => <Button className="btn btn-accent w-full">Sign a message</Button>

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
              type="username"
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
            message={`Signed message: ${data?.slice(0, 10)}...${data?.slice(-10)}`}
            show={!!data}
            variant="success"
          />
        </form>
      </CardContent>
    </Card>
  )
}
