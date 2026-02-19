import { ChainTypeEnum, OpenfortProvider } from '@openfort/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type React from 'react'
import { createContext, lazy, Suspense, useCallback, useContext, useMemo, useState } from 'react'
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

const WagmiWrapper = lazy(() => import('./providersWagmi').then((m) => ({ default: m.WagmiWrapper })))

export function Providers({ children }: { children?: React.ReactNode }) {
  const { mode } = usePlaygroundMode()
  const { providerOptions } = useAppStore()
  const [queryClient] = useState(() => new QueryClient())
  const chainType = mode === 'solana-only' ? ChainTypeEnum.SVM : ChainTypeEnum.EVM

  const openfortContent = (
    <OpenfortProvider {...providerOptions} chainType={chainType}>
      {children}
    </OpenfortProvider>
  )

  const content = (
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={null}>
        <WagmiWrapper>{openfortContent}</WagmiWrapper>
      </Suspense>
    </QueryClientProvider>
  )

  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      {content}
    </ThemeProvider>
  )
}
