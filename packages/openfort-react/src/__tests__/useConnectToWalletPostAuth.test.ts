import { ChainTypeEnum, RecoveryMethod } from '@openfort/openfort-js'
import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMockClient, createMockEmbeddedAccount, createMockWalletConfig } from './mocks/openfort-client'
import { createTestWrapper } from './mocks/wrapper'

// --- Module-level mocks ---

const mockClient = createMockClient()
const mockWalletConfig = createMockWalletConfig()
const mockSignOut = vi.fn()
const mockEnsureQueryData = vi.fn()

const mockEthCreate = vi.fn()
const mockEthSetActive = vi.fn()
const mockSolCreate = vi.fn()
const mockSolSetActive = vi.fn()

const mockSetEmbeddedAccounts = vi.fn()

vi.mock('../openfort/useOpenfort', () => ({
  useOpenfortCore: () => ({
    client: mockClient,
    chainType: ChainTypeEnum.EVM,
    setEmbeddedAccounts: mockSetEmbeddedAccounts,
    embeddedState: 4, // EmbeddedState.READY
  }),
}))

vi.mock('../components/Openfort/useOpenfort', () => ({
  useOpenfort: () => ({
    walletConfig: mockWalletConfig,
  }),
}))

vi.mock('../ethereum/hooks/useEthereumEmbeddedWallet', () => ({
  useEthereumEmbeddedWallet: () => ({
    create: mockEthCreate,
    setActive: mockEthSetActive,
    status: 'disconnected',
    address: undefined,
    wallets: [],
  }),
}))

vi.mock('../solana/hooks/useSolanaEmbeddedWallet', () => ({
  useSolanaEmbeddedWallet: () => ({
    create: mockSolCreate,
    setActive: mockSolSetActive,
    status: 'disconnected',
    address: undefined,
    wallets: [],
  }),
}))

vi.mock('../hooks/openfort/auth/useSignOut', () => ({
  useSignOut: () => ({
    signOut: mockSignOut,
  }),
}))

vi.mock('../utils/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
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
      connectOnLogin: true,
      ethereum: { chainId: 84532 },
    })
  })

  it('creates a new wallet when no wallets exist', async () => {
    const account = createMockEmbeddedAccount()
    mockEnsureQueryData.mockResolvedValue([])
    mockEthCreate.mockResolvedValue(account)

    const { result } = renderHook(() => useConnectToWalletPostAuth(), {
      wrapper: createTestWrapper(),
    })

    let tryResult: Awaited<ReturnType<typeof result.current.tryUseWallet>>
    await act(async () => {
      tryResult = await result.current.tryUseWallet({})
    })

    expect(mockEthCreate).toHaveBeenCalled()
    expect(tryResult!.wallet).toBeDefined()
    expect(tryResult!.wallet!.address).toBe(account.address)
  })

  it('recovers wallet with AUTOMATIC recovery when wallet exists', async () => {
    const autoAccount = createMockEmbeddedAccount({
      recoveryMethod: RecoveryMethod.AUTOMATIC,
      chainType: ChainTypeEnum.EVM,
    })
    mockEnsureQueryData.mockResolvedValue([autoAccount])
    mockEthSetActive.mockResolvedValue(undefined)

    const { result } = renderHook(() => useConnectToWalletPostAuth(), {
      wrapper: createTestWrapper(),
    })

    let tryResult: Awaited<ReturnType<typeof result.current.tryUseWallet>>
    await act(async () => {
      tryResult = await result.current.tryUseWallet({})
    })

    expect(mockEthSetActive).toHaveBeenCalledWith(expect.objectContaining({ address: autoAccount.address }))
    expect(tryResult!.wallet).toBeDefined()
  })

  it('recovers wallet with PASSKEY recovery when wallet exists', async () => {
    const passkeyAccount = createMockEmbeddedAccount({
      recoveryMethod: RecoveryMethod.PASSKEY,
      chainType: ChainTypeEnum.EVM,
    })
    mockEnsureQueryData.mockResolvedValue([passkeyAccount])
    mockEthSetActive.mockResolvedValue(undefined)

    const { result } = renderHook(() => useConnectToWalletPostAuth(), {
      wrapper: createTestWrapper(),
    })

    let tryResult: Awaited<ReturnType<typeof result.current.tryUseWallet>>
    await act(async () => {
      tryResult = await result.current.tryUseWallet({})
    })

    expect(mockEthSetActive).toHaveBeenCalled()
    expect(tryResult!.wallet).toBeDefined()
  })

  it('returns passwordRequired when only PASSWORD wallets exist', async () => {
    const pwAccount = createMockEmbeddedAccount({
      recoveryMethod: RecoveryMethod.PASSWORD,
      chainType: ChainTypeEnum.EVM,
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
    expect(mockEthCreate).not.toHaveBeenCalled()
    expect(mockEthSetActive).not.toHaveBeenCalled()
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
    expect(mockEthCreate).not.toHaveBeenCalled()
  })

  it('returns empty when connectOnLogin is false', async () => {
    mockWalletConfig.connectOnLogin = false

    const { result } = renderHook(() => useConnectToWalletPostAuth(), {
      wrapper: createTestWrapper(),
    })

    let tryResult: Awaited<ReturnType<typeof result.current.tryUseWallet>>
    await act(async () => {
      tryResult = await result.current.tryUseWallet({})
    })

    expect(tryResult!).toEqual({})
    expect(mockEthCreate).not.toHaveBeenCalled()
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
    expect(mockEthCreate).not.toHaveBeenCalled()
  })

  it('calls signOut when createWallet fails and logoutOnError is true', async () => {
    mockEnsureQueryData.mockResolvedValue([])
    mockEthCreate.mockRejectedValue(new Error('Creation failed'))

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
    mockEthCreate.mockRejectedValue(new Error('Creation failed'))

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
      chainType: ChainTypeEnum.EVM,
    })
    mockEnsureQueryData.mockResolvedValue([autoAccount])
    mockEthSetActive.mockRejectedValue(new Error('Recovery failed'))

    const { result } = renderHook(() => useConnectToWalletPostAuth(), {
      wrapper: createTestWrapper(),
    })

    await act(async () => {
      await result.current.tryUseWallet({ logoutOnError: true })
    })

    expect(mockSignOut).toHaveBeenCalled()
  })
})
