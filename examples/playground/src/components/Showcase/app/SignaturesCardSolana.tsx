import { useSolanaSignMessageAdapter } from '@openfort/react'
import { Button } from '@/components/Showcase/ui/Button'
import { InputMessage } from '@/components/Showcase/ui/InputMessage'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/cn'

export const SignaturesCardSolana = () => {
  const { data, signMessage, isPending, error } = useSolanaSignMessageAdapter()

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
          <Button className="btn btn-accent w-full" disabled={isPending}>
            {isPending ? 'Signing...' : 'Sign message'}
          </Button>
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
