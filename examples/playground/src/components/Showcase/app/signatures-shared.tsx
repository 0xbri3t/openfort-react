import type { ReactNode } from 'react'
import { Button } from '@/components/Showcase/ui/Button'
import { InputMessage } from '@/components/Showcase/ui/InputMessage'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/cn'

export interface SignaturesLayoutProps {
  tooltip?: { hook: string; body: ReactNode }
  isPending: boolean
  canSign: boolean
  signature: string | undefined
  error: Error | null | undefined
  onSubmit: (message: string) => void
}

export function SignaturesLayout({ tooltip, isPending, canSign, signature, error, onSubmit }: SignaturesLayoutProps) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const message = (e.currentTarget.message.value as string) || ''
    onSubmit(message)
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
        <form className="space-y-2" onSubmit={handleSubmit}>
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
            message={`Signed message: ${signature?.slice(0, 10)}...${signature?.slice(-10)}`}
            show={!!signature}
            variant="success"
          />
          <InputMessage message={error?.message ?? ''} show={!!error} variant="error" />
        </form>
      </CardContent>
    </Card>
  )
}
