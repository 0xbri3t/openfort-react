import { useWalletAuth } from '@openfort/react/wagmi'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useCallback, useState } from 'react'
import { DialogLayout } from '@/components/Showcase/auth/DialogLayout'
import { Button } from '@/components/Showcase/ui/Button'
import { Header } from '@/components/Showcase/ui/Header'
import { InputMessage } from '@/components/Showcase/ui/InputMessage'

export const Route = createFileRoute('/_showcase/showcase/auth/connect-wallet')({
  component: RouteComponent,
})

function RouteComponent() {
  const nav = useNavigate()
  const { availableWallets, connectWallet } = useWalletAuth()
  const [connectingTo, setConnectingTo] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleConnect = useCallback(
    async (connectorId: string) => {
      setConnectingTo(connectorId)
      setError(null)
      try {
        await connectWallet(connectorId, {
          onConnect: () => nav({ to: '/' }),
          onError: (msg) => setError(msg),
        })
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to connect')
      } finally {
        setConnectingTo(null)
      }
    },
    [connectWallet, nav]
  )

  return (
    <DialogLayout>
      <Header title="Connect Wallet" onBack={() => window.history.back()} />
      {availableWallets.map((c) => (
        <Button key={c.id} className="btn btn-accent" onClick={() => handleConnect(c.id)}>
          {connectingTo === c.id ? <span>Loading...</span> : (c.name ?? c.id)}
        </Button>
      ))}
      <InputMessage
        message={error || 'An error occurred while connecting to the wallet.'}
        show={!!error}
        variant="error"
      />
    </DialogLayout>
  )
}
