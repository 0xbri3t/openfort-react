import type { OpenfortWalletConfig } from '@openfort/react'
import { ChainTypeEnum, OpenfortProvider } from '@openfort/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type React from 'react'
import { createContext, lazy, Suspense, useCallback, useContext, useMemo, useState } from 'react'
import { baseSepolia, beamTestnet, polygonAmoy } from 'viem/chains'
import { ThemeProvider } from '@/components/theme-provider'
import { useAppStore } from './lib/useAppStore'

export type OpenfortPlaygroundMode = 'evm-only' | 'solana-only' | 'evm-wagmi'

const STORAGE_KEY = 'openfort-playground-mode'

function readStoredMode(): OpenfortPlaygroundMode {
  if (typeof window === 'undefined') return 'evm-only'
  const raw = localStorage.getItem(STORAGE_KEY)
  if (raw === 'evm-wagmi' || raw === 'solana-only') return raw
  return 'evm-only'
}

type PlaygroundModeContextValue = {
  mode: OpenfortPlaygroundMode
  setMode: (mode: OpenfortPlaygroundMode) => void
}

const PlaygroundModeContext = createContext<PlaygroundModeContextValue | null>(null)

export function PlaygroundModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<OpenfortPlaygroundMode>(readStoredMode)
  const setMode = useCallback((next: OpenfortPlaygroundMode) => {
    setModeState(next)
    localStorage.setItem(STORAGE_KEY, next)
  }, [])
  const value = useMemo(() => ({ mode, setMode }), [mode, setMode])
  return <PlaygroundModeContext.Provider value={value}>{children}</PlaygroundModeContext.Provider>
}

export function usePlaygroundMode(): PlaygroundModeContextValue {
  const ctx = useContext(PlaygroundModeContext)
  if (!ctx) throw new Error('usePlaygroundMode must be used within PlaygroundModeProvider')
  return ctx
}

// TODO: EVM + Wagmi mode errors until cookies cleared + refresh; fix after Solana and evm-only (viem) work well
const WagmiWrapper = lazy(() => import('./providersWagmi').then((m) => ({ default: m.WagmiWrapper })))

export function Providers({ children }: { children?: React.ReactNode }) {
  const { mode } = usePlaygroundMode()
  const { providerOptions } = useAppStore()
  const [queryClient] = useState(() => new QueryClient())

  const evmWalletConfig = {
    ...providerOptions.walletConfig,
    ethereum: {
      chainId: polygonAmoy.id,
      rpcUrls: {
        [polygonAmoy.id]: 'https://rpc-amoy.polygon.technology',
        [beamTestnet.id]: 'https://build.onbeam.com/rpc/testnet',
        [baseSepolia.id]: 'https://sepolia.base.org',
      },
    },
  }

  const openfortProps =
    mode === 'evm-only'
      ? {
          ...providerOptions,
          chainType: ChainTypeEnum.EVM,
          walletConfig: evmWalletConfig,
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
        : {
            ...providerOptions,
            chainType: ChainTypeEnum.EVM,
            walletConfig: evmWalletConfig,
          }

  const openfortContent = (
    <OpenfortProvider
      key={mode}
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
  )

  const content =
    mode === 'evm-wagmi' ? (
      <QueryClientProvider client={queryClient}>
        <Suspense fallback={null}>
          <WagmiWrapper>{openfortContent}</WagmiWrapper>
        </Suspense>
      </QueryClientProvider>
    ) : (
      <QueryClientProvider client={queryClient}>{openfortContent}</QueryClientProvider>
    )

  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      {content}
    </ThemeProvider>
  )
}
