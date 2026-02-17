import { useEthereumWalletAssets } from '@openfort/react/ethereum'
import { createFileRoute } from '@tanstack/react-router'
import { HookVariable } from '@/components/Variable/HookVariable'
import { Layout } from '../../../components/Layout'

export const Route = createFileRoute('/_hooks/wallet/useEthereumWalletAssets')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <Layout>
      <HookVariable
        name="useEthereumWalletAssets"
        hook={useEthereumWalletAssets}
        description="Fetches wallet assets (tokens, NFTs) for the connected Ethereum address via ERC-7811."
        variables={{
          refetch: {
            type: 'function',
            description: 'Function to refetch the wallet assets.',
          },
        }}
        defaultOptions={{
          assets: [],
        }}
      />
    </Layout>
  )
}
