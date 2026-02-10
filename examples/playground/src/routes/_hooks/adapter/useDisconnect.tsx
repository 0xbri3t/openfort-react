import { useEVMDisconnect } from '@openfort/react'
import { createFileRoute } from '@tanstack/react-router'
import { Layout } from '@/components/Layout'
import { HookVariable } from '@/components/Variable/HookVariable'

export const Route = createFileRoute('/_hooks/adapter/useDisconnect')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <Layout>
      <HookVariable
        name="useEVMDisconnect"
        hook={useEVMDisconnect}
        description="EVM adapter: disconnect(). Same shape as wagmi useDisconnect. Signs out from Openfort when in evm-only mode."
        variables={{
          disconnect: {
            description: 'Disconnect the wallet (sign out).',
          },
        }}
      />
    </Layout>
  )
}
