/**
 * Dynamic provider tree for the Openfort playground.
 *
 * - evm-wagmi: ThemeProvider → QueryClientProvider → WagmiProvider → OpenfortWagmiBridge → OpenfortProvider
 * - evm-only / solana-only: ThemeProvider → OpenfortProvider (no wagmi, no TanStack Query)
 *
 * Switching modes remounts the provider tree; wagmi/tanstack state is lost when leaving evm-wagmi.
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
  /** True right after a mode switch; used to show "Restoring session" only during remount, not during signup/login. */
  isPostModeSwitch: boolean
  clearPostModeSwitch: () => void
}

const PlaygroundModeContext = createContext<PlaygroundModeContextValue | null>(null)

export function PlaygroundModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<OpenfortPlaygroundMode>(readStoredMode)
  const [isPostModeSwitch, setIsPostModeSwitch] = useState(false)

  const setMode = useCallback((next: OpenfortPlaygroundMode) => {
    setModeState((prev) => {
      if (prev !== next) setIsPostModeSwitch(true)
      return next
    })
    localStorage.setItem(STORAGE_KEY, next)
  }, [])

  const clearPostModeSwitch = useCallback(() => setIsPostModeSwitch(false), [])

  const value = useMemo(
    () => ({ mode, setMode, isPostModeSwitch, clearPostModeSwitch }),
    [mode, setMode, isPostModeSwitch, clearPostModeSwitch]
  )
  return <PlaygroundModeContext.Provider value={value}>{children}</PlaygroundModeContext.Provider>
}

export function usePlaygroundMode(): PlaygroundModeContextValue {
  const ctx = useContext(PlaygroundModeContext)
  if (!ctx) throw new Error('usePlaygroundMode must be used within PlaygroundModeProvider')
  return ctx
}

/** Optional: called before mode switch when in evm-wagmi (e.g. to clear wagmi cache). */
const ModeSwitchContext = createContext<{ onBeforeModeSwitch?: () => void }>({})
export const useModeSwitchContext = () => useContext(ModeSwitchContext)

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

function WagmiProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())
  const { providerOptions } = useAppStore()
  const value = useMemo(() => ({ onBeforeModeSwitch: () => queryClient.clear() }), [queryClient])
  return (
    <ModeSwitchContext.Provider value={value}>
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={wagmiConfig}>
          <OpenfortWagmiBridge>
            <OpenfortProvider {...providerOptions}>{children}</OpenfortProvider>
          </OpenfortWagmiBridge>
        </WagmiProvider>
      </QueryClientProvider>
    </ModeSwitchContext.Provider>
  )
}

function OpenfortOnlyProviders({ children }: { children: React.ReactNode }) {
  const { providerOptions } = useAppStore()
  return (
    <ModeSwitchContext.Provider value={{}}>
      <OpenfortProvider {...providerOptions}>{children}</OpenfortProvider>
    </ModeSwitchContext.Provider>
  )
}

export function Providers({ children }: { children?: React.ReactNode }) {
  const { mode } = usePlaygroundMode()

  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      {mode === 'evm-wagmi' ? (
        <WagmiProviders>{children}</WagmiProviders>
      ) : (
        <OpenfortOnlyProviders>{children}</OpenfortOnlyProviders>
      )}
    </ThemeProvider>
  )
}
