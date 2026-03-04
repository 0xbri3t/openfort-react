import { ChainTypeEnum, EmbeddedState } from '@openfort/openfort-js'
import { act, renderHook } from '@testing-library/react'
import { createElement, type PropsWithChildren } from 'react'
import { describe, expect, it, vi } from 'vitest'
import type { OpenfortCoreContextValue } from '../../openfort/CoreOpenfortProvider'
import { Context } from '../../openfort/context'
import { createMockOpenfortClient } from '../mocks/openfortClient'
import { buildContextValue } from '../mocks/TestWrapper'

// Mock dependencies that useEthereumEmbeddedWallet needs
vi.mock('../../components/Openfort/useOpenfort', () => ({
  useOpenfort: () => ({
    walletConfig: { ethereum: { chainId: 80002 } },
    chainType: ChainTypeEnum.EVM,
  }),
}))
vi.mock('../../core/ConnectionStrategyContext', () => ({
  useConnectionStrategy: () => ({
    kind: 'embedded',
    chainType: ChainTypeEnum.EVM,
    getChainId: () => 80002,
    getActiveChainId: () => 80002,
    setActiveChainId: () => {},
    initProvider: async () => {},
  }),
  ConnectionStrategyProvider: ({ children }: PropsWithChildren) => children,
}))

const { useEthereumEmbeddedWallet } = await import('../../ethereum/hooks/useEthereumEmbeddedWallet')

function createWrapper(overrides: Partial<OpenfortCoreContextValue> = {}) {
  const value = buildContextValue(overrides)
  return function Wrapper({ children }: PropsWithChildren) {
    return createElement(Context.Provider, { value }, children)
  }
}

describe('useEthereumEmbeddedWallet', () => {
  it('returns fetching-wallets status when accounts are loading', () => {
    const wrapper = createWrapper({ isLoadingAccounts: true })
    const { result } = renderHook(() => useEthereumEmbeddedWallet(), { wrapper })

    expect(result.current.status).toBe('fetching-wallets')
    expect(result.current.isConnecting).toBe(true)
    expect(result.current.isConnected).toBe(false)
  })

  it('returns disconnected status when no accounts exist', () => {
    const wrapper = createWrapper({
      embeddedAccounts: [],
      isLoadingAccounts: false,
      embeddedState: EmbeddedState.READY,
    })
    const { result } = renderHook(() => useEthereumEmbeddedWallet(), { wrapper })

    expect(result.current.status).toBe('disconnected')
    expect(result.current.isDisconnected).toBe(true)
    expect(result.current.isConnected).toBe(false)
  })

  it('exposes create function', () => {
    const wrapper = createWrapper({
      embeddedState: EmbeddedState.READY,
      embeddedAccounts: [],
      isLoadingAccounts: false,
    })
    const { result } = renderHook(() => useEthereumEmbeddedWallet(), { wrapper })

    expect(typeof result.current.create).toBe('function')
  })

  it('syncs to connected when activeEmbeddedAddress matches an EVM account', async () => {
    const mockClient = createMockOpenfortClient()
    mockClient.embeddedWallet.getEthereumProvider.mockResolvedValue({} as any)

    const evmAccount = {
      id: 'acc_evm1',
      address: '0xABC123',
      chainType: ChainTypeEnum.EVM,
      ownerAddress: '0xOwner',
      accountType: 'SMART_ACCOUNT',
      chainId: 80002,
      createdAt: '2024-01-01',
    }

    const wrapper = createWrapper({
      client: mockClient as any,
      embeddedState: EmbeddedState.READY,
      embeddedAccounts: [evmAccount as any],
      isLoadingAccounts: false,
      activeEmbeddedAddress: '0xABC123',
    })

    const { result } = renderHook(() => useEthereumEmbeddedWallet(), { wrapper })

    // Wait for the async provider resolution
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50))
    })

    expect(result.current.status).toBe('connected')
    expect(result.current.isConnected).toBe(true)
  })
})
