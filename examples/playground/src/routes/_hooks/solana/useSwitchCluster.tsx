import { useSolanaSwitchCluster } from '@openfort/react'
import { createFileRoute } from '@tanstack/react-router'
import { Layout } from '@/components/Layout'
import { HookVariable } from '@/components/Variable/HookVariable'

export const Route = createFileRoute('/_hooks/solana/useSwitchCluster')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <Layout>
      <HookVariable
        name="useSolanaSwitchCluster"
        hook={useSolanaSwitchCluster}
        description="Solana adapter: clusters, currentCluster, switchCluster (mainnet-beta, devnet, testnet)."
      />
    </Layout>
  )
}
