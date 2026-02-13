import { embeddedWalletId, useConnectWithSiwe, useEthereumBridge } from '@openfort/react'
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
  const bridge = useEthereumBridge()
  const connectWithSiwe = useConnectWithSiwe()
  const [connectingTo, setConnectingTo] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const externalConnectors = bridge?.connectors.filter((c) => c.id !== embeddedWalletId) ?? []

  const handleConnect = useCallback(
    async (connectorId: string) => {
      setConnectingTo(connectorId)
      setError(null)
      try {
        const connector = externalConnectors.find((c) => c.id === connectorId)
        if (!connector) throw new Error('Connector not found')
        bridge?.connect({ connector })
        await connectWithSiwe({
          onConnect: () => nav({ to: '/' }),
          onError: (msg) => setError(msg),
        })
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to connect')
      } finally {
        setConnectingTo(null)
      }
    },
    [bridge, connectWithSiwe, externalConnectors, nav]
  )

  return (
    <DialogLayout>
      <Header title="Connect Wallet" onBack={() => window.history.back()} />
      {externalConnectors.map((c) => (
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
