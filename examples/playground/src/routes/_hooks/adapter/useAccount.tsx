import { useEVMAccount } from '@openfort/react'
import { createFileRoute } from '@tanstack/react-router'
import { Layout } from '@/components/Layout'
import { HookVariable } from '@/components/Variable/HookVariable'

export const Route = createFileRoute('/_hooks/adapter/useAccount')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <Layout>
      <HookVariable
        name="useEVMAccount"
        hook={useEVMAccount}
        description="EVM adapter: account (address, chainId, isConnected). Same shape as wagmi useAccount when not using WagmiProvider."
      />
    </Layout>
  )
}
