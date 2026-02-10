import type { OpenfortWalletConfig } from '@openfort/react'
import { ChainTypeEnum, OpenfortProvider } from '@openfort/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type React from 'react'
import { lazy, Suspense, useState } from 'react'
import { baseSepolia, beamTestnet, polygonAmoy } from 'viem/chains'
import { ThemeProvider } from '@/components/theme-provider'
import { useAppStore } from './lib/useAppStore'

export type OpenfortPlaygroundMode = 'evm-only' | 'solana-only' | 'evm-wagmi'

const MODE_ENV = import.meta.env.VITE_OPENFORT_MODE as string | undefined
export const mode: OpenfortPlaygroundMode =
  MODE_ENV === 'evm-wagmi' || MODE_ENV === 'solana-only' ? MODE_ENV : 'evm-only'

const WagmiWrapper = lazy(() => import('./providersWagmi').then((m) => ({ default: m.WagmiWrapper })))

export function Providers({ children }: { children?: React.ReactNode }) {
  const { providerOptions } = useAppStore()
  const [queryClient] = useState(() => new QueryClient())

  const openfortProps =
    mode === 'evm-only'
      ? {
          ...providerOptions,
          chainType: ChainTypeEnum.EVM,
          walletConfig: {
            ...providerOptions.walletConfig,
            ethereum: {
              chainId: polygonAmoy.id,
              rpcUrls: {
                [polygonAmoy.id]: 'https://rpc-amoy.polygon.technology',
                [beamTestnet.id]: 'https://subnets.avax.network/beam/testnet/rpc',
                [baseSepolia.id]: 'https://mainnet.base.org',
              },
            },
          },
        }
      : mode === 'solana-only'
        ? {
            ...providerOptions,
            chainType: ChainTypeEnum.SVM,
            walletConfig: {
              ...providerOptions.walletConfig,
              solana: { cluster: 'devnet' },
            },
          }
        : providerOptions

  const content = (
    <QueryClientProvider client={queryClient}>
      <OpenfortProvider
        {...openfortProps}
        walletConfig={
          (providerOptions.walletConfig && openfortProps.walletConfig
            ? { ...providerOptions.walletConfig, ...openfortProps.walletConfig }
            : providerOptions.walletConfig) as OpenfortWalletConfig | undefined
        }
        uiConfig={{
          ...openfortProps.uiConfig,
        }}
      >
        {children}
      </OpenfortProvider>
    </QueryClientProvider>
  )

  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      {mode === 'evm-wagmi' ? (
        <Suspense fallback={null}>
          <WagmiWrapper>{content}</WagmiWrapper>
        </Suspense>
      ) : (
        content
      )}
    </ThemeProvider>
  )
}
