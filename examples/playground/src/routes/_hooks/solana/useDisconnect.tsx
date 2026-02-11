import { useSVMDisconnect } from '@openfort/react'
import { createFileRoute } from '@tanstack/react-router'
import { Layout } from '@/components/Layout'
import { HookVariable } from '@/components/Variable/HookVariable'

export const Route = createFileRoute('/_hooks/solana/useDisconnect')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <Layout>
      <HookVariable
        name="useSVMDisconnect"
        hook={useSVMDisconnect}
        description="Solana adapter: disconnect (sign out) the wallet."
      />
    </Layout>
  )
}
