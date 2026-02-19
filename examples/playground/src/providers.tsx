/**
 * Unified provider tree for the Openfort playground.
 *
 * Supports all chains (EVM + Solana) in a single app. Mode switching only changes
 * which chain UI is shown; the provider tree stays the same to avoid remounts.
 *
 * Provider order (outer → inner):
 *   ThemeProvider → QueryClientProvider → WagmiProvider → OpenfortWagmiBridge → OpenfortProvider → children
 *
 * - WagmiProvider: Required for wagmi hooks (useConfig, useAccount, etc.)
 * - OpenfortWagmiBridge: Connects wagmi to Openfort; provides external wallet connectors
 * - OpenfortProvider: Auth, embedded wallets, connect modal
 */

import { OpenfortProvider } from '@openfort/react'
import { getDefaultConfig, getDefaultConnectors, OpenfortWagmiBridge } from '@openfort/wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type React from 'react'
import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { createConfig, http, WagmiProvider } from 'wagmi'
import { baseSepolia, beamTestnet, polygonAmoy } from 'wagmi/chains'
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

// ─── Wagmi config (shared across all modes) ─────────────────────────────────

const walletConnectProjectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID
if (!walletConnectProjectId) {
  throw new Error('VITE_WALLETCONNECT_PROJECT_ID is not set')
}

const defaultConnectors = getDefaultConnectors({
  app: { name: 'Openfort demo' },
  walletConnectProjectId,
})

const wagmiConfig = createConfig(
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

// ─── Providers ─────────────────────────────────────────────────────────────

export function Providers({ children }: { children?: React.ReactNode }) {
  const { providerOptions } = useAppStore()
  const [queryClient] = useState(() => new QueryClient())

  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={wagmiConfig}>
          <OpenfortWagmiBridge>
            <OpenfortProvider {...providerOptions}>{children}</OpenfortProvider>
          </OpenfortWagmiBridge>
        </WagmiProvider>
      </QueryClientProvider>
    </ThemeProvider>
  )
}
