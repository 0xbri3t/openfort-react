import { ChainTypeEnum, EmbeddedState } from '@openfort/openfort-js'
import { renderHook } from '@testing-library/react'
import { createElement, type PropsWithChildren } from 'react'
import { describe, expect, it, vi } from 'vitest'
import type { OpenfortCoreContextValue } from '../../openfort/CoreOpenfortProvider'
import { Context } from '../../openfort/context'
import { SolanaContext } from '../../solana/SolanaContext'
import { buildContextValue } from '../mocks/TestWrapper'

// Mock dependencies that useSolanaEmbeddedWallet needs
vi.mock('../../components/Openfort/useOpenfort', () => ({
  useOpenfort: () => ({
    walletConfig: { solana: { cluster: 'devnet' } },
    chainType: ChainTypeEnum.SVM,
  }),
}))

const { useSolanaEmbeddedWallet } = await import('../../solana/hooks/useSolanaEmbeddedWallet')

function createWrapper(
  coreOverrides: Partial<OpenfortCoreContextValue> = {},
  solanaCtx?: { cluster: string; rpcUrl: string; commitment: string; setCluster: (c: string) => void }
) {
  const value = buildContextValue({ chainType: ChainTypeEnum.SVM, ...coreOverrides })
  return function Wrapper({ children }: PropsWithChildren) {
    const core = createElement(Context.Provider, { value }, children)
    if (solanaCtx) {
      return createElement(SolanaContext.Provider, { value: solanaCtx }, core)
    }
    return core
  }
}

describe('useSolanaEmbeddedWallet', () => {
  it('filters only SVM accounts from embeddedAccounts', () => {
    const accounts = [
      { id: 'evm1', address: '0xEVM', chainType: ChainTypeEnum.EVM },
      { id: 'svm1', address: 'SoLaNaAddr1', chainType: ChainTypeEnum.SVM },
      { id: 'evm2', address: '0xEVM2', chainType: ChainTypeEnum.EVM },
      { id: 'svm2', address: 'SoLaNaAddr2', chainType: ChainTypeEnum.SVM },
    ]

    const wrapper = createWrapper({
      embeddedAccounts: accounts as any,
      embeddedState: EmbeddedState.READY,
      isLoadingAccounts: false,
    })

    const { result } = renderHook(() => useSolanaEmbeddedWallet(), { wrapper })

    expect(result.current.wallets).toHaveLength(2)
    expect(result.current.wallets[0].address).toBe('SoLaNaAddr1')
    expect(result.current.wallets[1].address).toBe('SoLaNaAddr2')
  })

  it('returns disconnected when no SVM accounts', () => {
    const wrapper = createWrapper({
      embeddedAccounts: [],
      embeddedState: EmbeddedState.READY,
      isLoadingAccounts: false,
    })

    const { result } = renderHook(() => useSolanaEmbeddedWallet(), { wrapper })

    expect(result.current.status).toBe('disconnected')
    expect(result.current.isDisconnected).toBe(true)
  })

  it('resolves cluster from SolanaContext', () => {
    const wrapper = createWrapper(
      {
        embeddedAccounts: [],
        embeddedState: EmbeddedState.READY,
        isLoadingAccounts: false,
      },
      { cluster: 'devnet', rpcUrl: 'https://api.devnet.solana.com', commitment: 'confirmed', setCluster: () => {} }
    )

    const { result } = renderHook(() => useSolanaEmbeddedWallet(), { wrapper })

    expect(result.current.cluster).toBe('devnet')
    expect(result.current.rpcUrl).toBe('https://api.devnet.solana.com')
  })

  it('option cluster overrides SolanaContext cluster', () => {
    const wrapper = createWrapper(
      {
        embeddedAccounts: [],
        embeddedState: EmbeddedState.READY,
        isLoadingAccounts: false,
      },
      { cluster: 'devnet', rpcUrl: 'https://api.devnet.solana.com', commitment: 'confirmed', setCluster: () => {} }
    )

    const { result } = renderHook(() => useSolanaEmbeddedWallet({ cluster: 'mainnet-beta' as any }), { wrapper })

    expect(result.current.cluster).toBe('mainnet-beta')
  })

  it('returns fetching-wallets when accounts are loading', () => {
    const wrapper = createWrapper({ isLoadingAccounts: true })
    const { result } = renderHook(() => useSolanaEmbeddedWallet(), { wrapper })

    expect(result.current.status).toBe('fetching-wallets')
    expect(result.current.isConnecting).toBe(true)
  })
})
