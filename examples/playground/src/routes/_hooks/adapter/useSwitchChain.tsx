import { useEVMSwitchChain } from '@openfort/react'
import { createFileRoute } from '@tanstack/react-router'
import { Layout } from '@/components/Layout'
import { HookVariable } from '@/components/Variable/HookVariable'

export const Route = createFileRoute('/_hooks/adapter/useSwitchChain')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <Layout>
      <HookVariable
        name="useEVMSwitchChain"
        hook={useEVMSwitchChain}
        description="EVM adapter: chains, currentChainId, switchChain({ chainId }). Same shape as wagmi useSwitchChain when not using WagmiProvider."
        variables={{
          switchChain: {
            description: 'Switch to the given chain by id.',
          },
          chains: {
            description: 'List of configured chains (from walletConfig.ethereum.rpcUrls).',
          },
        }}
      />
    </Layout>
  )
}
