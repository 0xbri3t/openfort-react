import { useConnectWithSiwe } from '@openfort/react'
import { createFileRoute } from '@tanstack/react-router'
import { HookVariable } from '@/components/Variable/HookVariable'
import { Layout } from '../../../components/Layout'

export const Route = createFileRoute('/_hooks/auth/useConnectWithSiwe')({
  component: RouteComponent,
})

function RouteComponent() {
  const _connectWithSiwe = useConnectWithSiwe()

  return (
    <Layout>
      <HookVariable
        name="useConnectWithSiwe"
        hook={useConnectWithSiwe}
        description="Connect or link an external wallet via SIWE (Sign-In with Ethereum). Requires @openfort/wagmi bridge."
        variables={{
          connectWithSiwe: {
            description: 'Authenticate or link an external wallet using SIWE.',
          },
        }}
      />
    </Layout>
  )
}
