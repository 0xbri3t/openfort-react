import { useSolanaAccount } from '@openfort/react'
import { createFileRoute } from '@tanstack/react-router'
import { Layout } from '@/components/Layout'
import { HookVariable } from '@/components/Variable/HookVariable'

export const Route = createFileRoute('/_hooks/solana/useSolanaAccount')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <Layout>
      <HookVariable
        name="useSolanaAccount"
        hook={useSolanaAccount}
        description="Solana adapter: connected address (Base58), cluster, and isConnected."
      />
    </Layout>
  )
}
