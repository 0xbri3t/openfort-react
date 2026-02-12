import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export const CreateSessionKeyCardSolana = () => {
  return (
    <Card className="opacity-75 pointer-events-none">
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle>Session keys</CardTitle>
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
            Coming soon
          </span>
        </div>
        <CardDescription>
          Session keys (EIP-7715) are currently available for EVM only. Solana delegation requires SDK support and is
          not yet implemented.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Use the EVM-connected view to grant and manage session keys with specific permissions.
        </p>
      </CardContent>
    </Card>
  )
}
