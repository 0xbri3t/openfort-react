import { ChainTypeEnum, EmbeddedState } from '@openfort/openfort-js'
import { createElement, type PropsWithChildren } from 'react'
import type { OpenfortCoreContextValue } from '../../openfort/CoreOpenfortProvider'
import { Context } from '../../openfort/context'
import { createMockOpenfortClient } from './openfortClient'

/**
 * Builds a partial OpenfortCoreContextValue merged with defaults.
 * Use in tests to provide only the values your test cares about.
 */
export function buildContextValue(overrides: Partial<OpenfortCoreContextValue> = {}): OpenfortCoreContextValue {
  const mockClient = createMockOpenfortClient()

  return {
    chainType: ChainTypeEnum.EVM,
    setChainType: () => {},
    signUpGuest: async () => {},
    embeddedState: EmbeddedState.NONE,
    isLoading: false,
    needsRecovery: false,
    user: null,
    updateUser: async () => null,
    linkedAccounts: [],
    embeddedAccounts: undefined,
    isLoadingAccounts: false,
    activeEmbeddedAddress: undefined,
    setActiveEmbeddedAddress: () => {},
    logout: () => {},
    updateEmbeddedAccounts: async () => undefined,
    walletStatus: { status: 'idle' },
    setWalletStatus: () => {},
    client: mockClient as unknown as OpenfortCoreContextValue['client'],
    ...overrides,
  }
}

/**
 * Test wrapper that provides OpenfortCoreContext.
 * Usage: `renderHook(useUser, { wrapper: createTestWrapper({ user: mockUser }) })`
 */
export function createTestWrapper(overrides: Partial<OpenfortCoreContextValue> = {}) {
  const value = buildContextValue(overrides)
  return function TestCoreWrapper({ children }: PropsWithChildren) {
    return createElement(Context.Provider, { value }, children)
  }
}
