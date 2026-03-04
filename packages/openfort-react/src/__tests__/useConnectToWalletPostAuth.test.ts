import { RecoveryMethod } from '@openfort/openfort-js'
import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createMockClient,
  createMockEmbeddedAccount,
  createMockWalletConfig,
  MOCK_ADDRESS,
} from './mocks/openfort-client'
import { createTestWrapper } from './mocks/wrapper'

// --- Module-level mocks ---

const mockCreateWallet = vi.fn()
const mockSetActiveWallet = vi.fn()
const mockSignOut = vi.fn()
const mockWalletConfig = createMockWalletConfig()
const mockEnsureQueryData = vi.fn()
const mockClient = createMockClient()

vi.mock('../hooks/openfort/useWallets', () => ({
  useWallets: () => ({
    createWallet: mockCreateWallet,
    setActiveWallet: mockSetActiveWallet,
  }),
}))

vi.mock('../components/Openfort/useOpenfort', () => ({
  useOpenfort: () => ({
    walletConfig: mockWalletConfig,
  }),
}))

vi.mock('../openfort/useOpenfort', () => ({
  useOpenfortCore: () => ({
    client: mockClient,
  }),
}))

vi.mock('../hooks/openfort/auth/useSignOut', () => ({
  useSignOut: () => ({
    signOut: mockSignOut,
  }),
}))

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>()
  return {
    ...actual,
    useQueryClient: () => ({
      ensureQueryData: mockEnsureQueryData,
    }),
  }
})

const { useConnectToWalletPostAuth } = await import('../hooks/openfort/auth/useConnectToWalletPostAuth')

describe('useConnectToWalletPostAuth — tryUseWallet', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSignOut.mockResolvedValue(undefined)
    Object.assign(mockWalletConfig, {
      createEncryptedSessionEndpoint: 'https://example.com/session',
      getEncryptionSession: undefined,
      recoverWalletAutomaticallyAfterAuth: true,
    })
  })

  it('creates a new wallet when no wallets exist', async () => {
    const mockWallet = { address: MOCK_ADDRESS }
    mockEnsureQueryData.mockResolvedValue([])
    mockCreateWallet.mockResolvedValue({ wallet: mockWallet })

    const { result } = renderHook(() => useConnectToWalletPostAuth(), {
      wrapper: createTestWrapper(),
    })

    let tryResult: Awaited<ReturnType<typeof result.current.tryUseWallet>>
    await act(async () => {
      tryResult = await result.current.tryUseWallet({})
    })

    expect(mockCreateWallet).toHaveBeenCalled()
    expect(tryResult!.wallet).toBe(mockWallet)
  })

  it('recovers wallet with AUTOMATIC recovery when wallet exists', async () => {
    const autoAccount = createMockEmbeddedAccount({
      recoveryMethod: RecoveryMethod.AUTOMATIC,
    })
    const mockWallet = { address: MOCK_ADDRESS }
    mockEnsureQueryData.mockResolvedValue([autoAccount])
    mockSetActiveWallet.mockResolvedValue({ wallet: mockWallet })

    const { result } = renderHook(() => useConnectToWalletPostAuth(), {
      wrapper: createTestWrapper(),
    })

    let tryResult: Awaited<ReturnType<typeof result.current.tryUseWallet>>
    await act(async () => {
      tryResult = await result.current.tryUseWallet({})
    })

    expect(mockSetActiveWallet).toHaveBeenCalled()
    expect(tryResult!.wallet).toBe(mockWallet)
  })

  it('recovers wallet with PASSKEY recovery when wallet exists', async () => {
    const passkeyAccount = createMockEmbeddedAccount({
      recoveryMethod: RecoveryMethod.PASSKEY,
    })
    const mockWallet = { address: MOCK_ADDRESS }
    mockEnsureQueryData.mockResolvedValue([passkeyAccount])
    mockSetActiveWallet.mockResolvedValue({ wallet: mockWallet })

    const { result } = renderHook(() => useConnectToWalletPostAuth(), {
      wrapper: createTestWrapper(),
    })

    let tryResult: Awaited<ReturnType<typeof result.current.tryUseWallet>>
    await act(async () => {
      tryResult = await result.current.tryUseWallet({})
    })

    expect(mockSetActiveWallet).toHaveBeenCalled()
    expect(tryResult!.wallet).toBe(mockWallet)
  })

  it('returns passwordRequired when only PASSWORD wallets exist', async () => {
    const pwAccount = createMockEmbeddedAccount({
      recoveryMethod: RecoveryMethod.PASSWORD,
    })
    mockEnsureQueryData.mockResolvedValue([pwAccount])

    const { result } = renderHook(() => useConnectToWalletPostAuth(), {
      wrapper: createTestWrapper(),
    })

    let tryResult: Awaited<ReturnType<typeof result.current.tryUseWallet>>
    await act(async () => {
      tryResult = await result.current.tryUseWallet({})
    })

    expect(tryResult!.passwordRequired).toBe(true)
    expect(tryResult!.wallet).toBeUndefined()
    expect(mockCreateWallet).not.toHaveBeenCalled()
    expect(mockSetActiveWallet).not.toHaveBeenCalled()
  })

  it('returns empty when no encryption session config', async () => {
    mockWalletConfig.createEncryptedSessionEndpoint = undefined
    mockWalletConfig.getEncryptionSession = undefined

    const { result } = renderHook(() => useConnectToWalletPostAuth(), {
      wrapper: createTestWrapper(),
    })

    let tryResult: Awaited<ReturnType<typeof result.current.tryUseWallet>>
    await act(async () => {
      tryResult = await result.current.tryUseWallet({})
    })

    expect(tryResult!).toEqual({})
    expect(mockCreateWallet).not.toHaveBeenCalled()
  })

  it('returns empty when recoverWalletAutomaticallyAfterAuth is false', async () => {
    mockWalletConfig.recoverWalletAutomaticallyAfterAuth = false

    const { result } = renderHook(() => useConnectToWalletPostAuth(), {
      wrapper: createTestWrapper(),
    })

    let tryResult: Awaited<ReturnType<typeof result.current.tryUseWallet>>
    await act(async () => {
      tryResult = await result.current.tryUseWallet({})
    })

    expect(tryResult!).toEqual({})
    expect(mockCreateWallet).not.toHaveBeenCalled()
  })

  it('returns empty when recoverWalletAutomatically option is false', async () => {
    const { result } = renderHook(() => useConnectToWalletPostAuth(), {
      wrapper: createTestWrapper(),
    })

    let tryResult: Awaited<ReturnType<typeof result.current.tryUseWallet>>
    await act(async () => {
      tryResult = await result.current.tryUseWallet({
        recoverWalletAutomatically: false,
      })
    })

    expect(tryResult!).toEqual({})
    expect(mockCreateWallet).not.toHaveBeenCalled()
  })

  it('calls signOut when createWallet fails and logoutOnError is true', async () => {
    mockEnsureQueryData.mockResolvedValue([])
    mockCreateWallet.mockResolvedValue({ error: new Error('Creation failed') })

    const { result } = renderHook(() => useConnectToWalletPostAuth(), {
      wrapper: createTestWrapper(),
    })

    await act(async () => {
      await result.current.tryUseWallet({ logoutOnError: true })
    })

    expect(mockSignOut).toHaveBeenCalled()
  })

  it('does not call signOut when createWallet fails and logoutOnError is false', async () => {
    mockEnsureQueryData.mockResolvedValue([])
    mockCreateWallet.mockResolvedValue({ error: new Error('Creation failed') })

    const { result } = renderHook(() => useConnectToWalletPostAuth(), {
      wrapper: createTestWrapper(),
    })

    await act(async () => {
      await result.current.tryUseWallet({ logoutOnError: false })
    })

    expect(mockSignOut).not.toHaveBeenCalled()
  })

  it('calls signOut when setActiveWallet fails and logoutOnError is true', async () => {
    const autoAccount = createMockEmbeddedAccount({
      recoveryMethod: RecoveryMethod.AUTOMATIC,
    })
    mockEnsureQueryData.mockResolvedValue([autoAccount])
    mockSetActiveWallet.mockResolvedValue({ error: new Error('Recovery failed') })

    const { result } = renderHook(() => useConnectToWalletPostAuth(), {
      wrapper: createTestWrapper(),
    })

    await act(async () => {
      await result.current.tryUseWallet({ logoutOnError: true })
    })

    expect(mockSignOut).toHaveBeenCalled()
  })
})
