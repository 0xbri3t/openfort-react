import { ChainTypeEnum, EmbeddedState } from '@openfort/openfort-js'
import { act, render } from '@testing-library/react'
import { createElement, useContext } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Context } from '../../openfort/context'
import { createMockOpenfortClient, type MockOpenfortClient } from '../mocks/openfortClient'

let mockClient: MockOpenfortClient

// Mock the Openfort SDK constructor
vi.mock('../../openfort/core', () => ({
  createOpenfortClient: () => mockClient,
  setDefaultClient: () => {},
}))

// Mock heavy dependencies to avoid importing the entire component tree
vi.mock('../../components/Openfort/useOpenfort', () => ({
  useOpenfort: () => ({
    walletConfig: undefined,
    chainType: ChainTypeEnum.EVM,
    setChainType: () => {},
    uiConfig: { walletConnectName: undefined },
    open: false,
    route: null,
    connector: null,
  }),
}))
vi.mock('../../wallets/useExternalConnectors', () => ({
  mapBridgeConnectorsToWalletProps: () => [],
}))
vi.mock('../../hooks/useConnectLifecycle', () => ({
  useConnectLifecycle: () => {},
}))
vi.mock('../../ethereum/OpenfortEthereumBridgeContext', () => ({
  OpenfortEthereumBridgeContext: { Provider: ({ children }: any) => children },
}))

const { CoreOpenfortProvider } = await import('../../openfort/CoreOpenfortProvider')

function ContextReader({ onValue }: { onValue: (v: any) => void }) {
  const ctx = useContext(Context)
  onValue(ctx)
  return null
}

describe('CoreOpenfortProvider', () => {
  beforeEach(() => {
    mockClient = createMockOpenfortClient()
  })

  afterEach(() => {
    mockClient._test.reset()
  })

  const openfortConfig = {
    baseConfiguration: { publishableKey: 'pk_test_123' },
  }

  it('calls watchEmbeddedState on mount', () => {
    render(createElement(CoreOpenfortProvider, { openfortConfig }, createElement('div')))

    expect(mockClient.embeddedWallet.watchEmbeddedState).toHaveBeenCalledOnce()
    expect(mockClient.embeddedWallet.watchEmbeddedState).toHaveBeenCalledWith({
      onChange: expect.any(Function),
      onError: expect.any(Function),
    })
  })

  it('calls unwatch on unmount', () => {
    const { unmount } = render(createElement(CoreOpenfortProvider, { openfortConfig }, createElement('div')))

    expect(mockClient._test.unwatchFn).not.toHaveBeenCalled()

    unmount()

    expect(mockClient._test.unwatchFn).toHaveBeenCalledOnce()
  })

  it('provides embeddedState to context consumers', () => {
    let contextValue: any = null

    render(
      createElement(
        CoreOpenfortProvider,
        { openfortConfig },
        createElement(ContextReader, {
          onValue: (v: any) => {
            contextValue = v
          },
        })
      )
    )

    // Initial state from watchEmbeddedState's immediate emission
    expect(contextValue).not.toBeNull()
    expect(contextValue.embeddedState).toBe(EmbeddedState.NONE)
  })

  it('updates context when watchEmbeddedState emits a state change', () => {
    let contextValue: any = null

    render(
      createElement(
        CoreOpenfortProvider,
        { openfortConfig },
        createElement(ContextReader, {
          onValue: (v: any) => {
            contextValue = v
          },
        })
      )
    )

    expect(contextValue.embeddedState).toBe(EmbeddedState.NONE)

    // Simulate state change
    act(() => {
      mockClient._test.setEmbeddedState(EmbeddedState.UNAUTHENTICATED)
    })

    expect(contextValue.embeddedState).toBe(EmbeddedState.UNAUTHENTICATED)
  })

  it('transitions through multiple states correctly', () => {
    let contextValue: any = null

    render(
      createElement(
        CoreOpenfortProvider,
        { openfortConfig },
        createElement(ContextReader, {
          onValue: (v: any) => {
            contextValue = v
          },
        })
      )
    )

    act(() => {
      mockClient._test.setEmbeddedState(EmbeddedState.UNAUTHENTICATED)
    })
    expect(contextValue.embeddedState).toBe(EmbeddedState.UNAUTHENTICATED)

    act(() => {
      mockClient._test.setEmbeddedState(EmbeddedState.EMBEDDED_SIGNER_NOT_CONFIGURED)
    })
    expect(contextValue.embeddedState).toBe(EmbeddedState.EMBEDDED_SIGNER_NOT_CONFIGURED)

    act(() => {
      mockClient._test.setEmbeddedState(EmbeddedState.READY)
    })
    expect(contextValue.embeddedState).toBe(EmbeddedState.READY)
  })

  it('logout clears user and embedded accounts', async () => {
    let contextValue: any = null

    render(
      createElement(
        CoreOpenfortProvider,
        { openfortConfig },
        createElement(ContextReader, {
          onValue: (v: any) => {
            contextValue = v
          },
        })
      )
    )

    await act(async () => {
      await contextValue.logout()
    })

    expect(mockClient.auth.logout).toHaveBeenCalledOnce()
    expect(contextValue.user).toBeNull()
    expect(contextValue.embeddedAccounts).toBeUndefined()
    expect(contextValue.activeEmbeddedAddress).toBeUndefined()
  })
})
