import { getDefaultConfig, OpenfortWagmiBridge } from '@openfort/wagmi'
import type React from 'react'
import { createConfig, http, WagmiProvider } from 'wagmi'
import { baseSepolia, beamTestnet, polygonAmoy } from 'wagmi/chains'

const config = createConfig(
  getDefaultConfig({
    appName: 'Openfort demo',
    walletConnectProjectId: 'fc3261354522f71e19adc4081a7e9f53',
    chains: [polygonAmoy, beamTestnet, baseSepolia],
    transports: {
      [polygonAmoy.id]: http('https://rpc-amoy.polygon.technology'),
      [beamTestnet.id]: http('https://build.onbeam.com/rpc/testnet'),
      [baseSepolia.id]: http('https://sepolia.base.org'),
    },
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
