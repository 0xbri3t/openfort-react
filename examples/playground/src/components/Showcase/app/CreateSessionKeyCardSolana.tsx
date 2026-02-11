import { useSolanaSignMessageAdapter } from '@openfort/react'
import { Button } from '@/components/Showcase/ui/Button'
import { InputMessage } from '@/components/Showcase/ui/InputMessage'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export const CreateSessionKeyCardSolana = () => {
  const { data, signMessage, isPending, error } = useSolanaSignMessageAdapter()

  return (
    <Card>
      <CardHeader>
        <CardTitle>Session keys</CardTitle>
        <CardDescription>
          Grant session keys with specific permissions. Session keys (EIP-7715) are EVM-only. Solana delegation support
          coming soon.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault()
            const message = (e.target as HTMLFormElement).message?.value || 'Session key authorization'
            signMessage({ message })
          }}
        >
          <label className="input w-full">
            <input
              name="message"
              type="text"
              placeholder="Sign to authorize (placeholder)"
              className="grow peer"
              defaultValue="Session key authorization"
            />
          </label>
          <Button className="btn btn-accent w-full" disabled={isPending}>
            {isPending ? 'Signing...' : 'Create session key'}
          </Button>
          <InputMessage
            message={data ? `Signed: ${data.slice(0, 12)}...${data.slice(-8)}` : ''}
            show={!!data}
            variant="success"
          />
          <InputMessage message={error?.message ?? ''} show={!!error} variant="error" />
          <p className="text-xs text-muted-foreground">
            For now, this signs a message. Full Solana session key grant/revoke (like EIP-7715) requires SDK support.
          </p>
        </form>
      </CardContent>
    </Card>
  )
}
