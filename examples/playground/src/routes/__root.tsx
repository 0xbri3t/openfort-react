import { ChainTypeEnum, type Theme, useChain, useUser } from '@openfort/react'
import { createRootRoute, Outlet, useLocation } from '@tanstack/react-router'
import { useEffect, useLayoutEffect } from 'react'
import z from 'zod'
import { Nav } from '@/components/Nav'
import { useAppStore } from '@/lib/useAppStore'
import { usePlaygroundMode } from '@/providers'

const MODE_TO_CHAIN: Record<'evm-only' | 'solana-only' | 'evm-wagmi', ChainTypeEnum> = {
  'evm-only': ChainTypeEnum.EVM,
  'solana-only': ChainTypeEnum.SVM,
  'evm-wagmi': ChainTypeEnum.EVM,
}

export const Route = createRootRoute({
  component: RootComponent,
  validateSearch: z.object({
    focus: z.string().optional(),
  }),
})

const themes: Theme[] = ['auto', 'midnight', 'nouns', 'retro', 'rounded', 'soft', 'web95', 'minimal']

let themeIndex = 0

function RootComponent() {
  const { mode } = usePlaygroundMode()
  const { chainType, setChainType } = useChain()
  const { isConnected } = useUser()

  // Sync chainType from stored playground mode on load and when mode changes.
  useLayoutEffect(() => {
    const targetChain = MODE_TO_CHAIN[mode]
    if (chainType !== targetChain) {
      setChainType(targetChain)
    }
  }, [mode, chainType, setChainType])
  const location = useLocation()

  const { setProviderOptions, providerOptions } = useAppStore()

  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if ((e.key === 'ArrowRight' || e.key === 'ArrowLeft') && (e.target as HTMLElement).tagName !== 'INPUT') {
        const delta = e.key === 'ArrowRight' ? 1 : -1
        themeIndex = (themeIndex + delta + themes.length) % themes.length

        setProviderOptions({
          ...providerOptions,
          uiConfig: {
            ...providerOptions.uiConfig,
            theme: themes[themeIndex],
          },
        })
      }
    }

    document.addEventListener('keydown', handleKeydown)
    return () => document.removeEventListener('keydown', handleKeydown)
  }, [setProviderOptions, providerOptions])

  return (
    <div className="flex flex-col min-h-screen w-screen">
      <Nav showLogo={location.pathname !== '/showcase/auth' || isConnected} />
      <Outlet />
    </div>
  )
}
