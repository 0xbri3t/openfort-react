import { useEVMBalance } from '@openfort/react'
import { createFileRoute } from '@tanstack/react-router'
import { Layout } from '@/components/Layout'
import { HookVariable } from '@/components/Variable/HookVariable'

export const Route = createFileRoute('/_hooks/adapter/useBalance')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <Layout>
      <HookVariable
        name="useEVMBalance"
        hook={useEVMBalance}
        description="EVM adapter: balance (data.value, data.formatted, refetch). Uses connected wallet address. Same shape as wagmi useBalance."
        variables={{
          refetch: {
            description: 'Function to refetch the balance.',
          },
        }}
      />
    </Layout>
  )
}
