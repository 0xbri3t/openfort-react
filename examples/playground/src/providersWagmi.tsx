import { getDefaultConfig, getDefaultConnectors, OpenfortWagmiBridge } from '@openfort/wagmi'
import type React from 'react'
import { createConfig, http, WagmiProvider } from 'wagmi'
import { baseSepolia, beamTestnet, polygonAmoy } from 'wagmi/chains'

const walletConnectProjectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID

if (!walletConnectProjectId) {
  throw new Error('VITE_WALLETCONNECT_PROJECT_ID is not set')
}

const defaultConnectors = getDefaultConnectors({
  app: { name: 'Openfort demo' },
  walletConnectProjectId,
})

const config = createConfig(
  getDefaultConfig({
    appName: 'Openfort demo',
    walletConnectProjectId,
    chains: [beamTestnet, polygonAmoy, baseSepolia],
    transports: {
      [polygonAmoy.id]: http('https://rpc-amoy.polygon.technology'),
      [beamTestnet.id]: http('https://build.onbeam.com/rpc/testnet'),
      [baseSepolia.id]: http('https://sepolia.base.org'),
    },
    connectors: [...defaultConnectors],
  })
)

/**
 * WagmiProvider must wrap OpenfortWagmiBridge so wagmi hooks (e.g. useConfig) run in context.
 * Order: WagmiProvider > OpenfortWagmiBridge > children.
 */
export function WagmiWrapper({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <OpenfortWagmiBridge>{children}</OpenfortWagmiBridge>
    </WagmiProvider>
  )
}
