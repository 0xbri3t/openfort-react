import { useSolanaBalanceAdapter } from '@openfort/react'
import { createFileRoute } from '@tanstack/react-router'
import { Layout } from '@/components/Layout'
import { HookVariable } from '@/components/Variable/HookVariable'

export const Route = createFileRoute('/_hooks/solana/useSolanaBalance')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <Layout>
      <HookVariable
        name="useSolanaBalanceAdapter"
        hook={useSolanaBalanceAdapter}
        description="Solana adapter: SOL balance (value, formatted, symbol, decimals), refetch, isLoading, error."
      />
    </Layout>
  )
}
