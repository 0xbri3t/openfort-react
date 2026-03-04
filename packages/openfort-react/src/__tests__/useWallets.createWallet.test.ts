import { AccountTypeEnum, ChainTypeEnum, RecoveryMethod } from '@openfort/openfort-js'
import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createMockClient,
  createMockEmbeddedAccount,
  createMockWalletConfig,
  MOCK_ACCESS_TOKEN,
  MOCK_CHAIN_ID,
  MOCK_ENCRYPTION_SESSION,
  MOCK_USER_ID,
} from './mocks/openfort-client'
import { createTestWrapper } from './mocks/wrapper'

// --- Module-level mocks ---

const mockClient = createMockClient()
const mockWalletConfig = createMockWalletConfig()
const mockSetStatus = vi.fn()
const mockUpdateEmbeddedAccounts = vi.fn().mockResolvedValue({ data: [] })

vi.mock('../openfort/useOpenfort', () => ({
  useOpenfortCore: () => ({
    client: mockClient,
    embeddedAccounts: [],
    isLoadingAccounts: false,
    updateEmbeddedAccounts: mockUpdateEmbeddedAccounts,
  }),
  useWalletStatus: () => [{ status: 'idle' }, mockSetStatus],
}))

vi.mock('../components/Openfort/useOpenfort', () => ({
  useOpenfort: () => ({
    walletConfig: mockWalletConfig,
    setOpen: vi.fn(),
    setRoute: vi.fn(),
    setConnector: vi.fn(),
    uiConfig: {},
  }),
}))

vi.mock('../hooks/openfort/useUser', () => ({
  useUser: () => ({
    linkedAccounts: [],
    user: { id: MOCK_USER_ID, email: 'test@example.com' },
  }),
}))

vi.mock('../wallets/useWagmiWallets', () => ({
  useWagmiWallets: () => [],
}))

vi.mock('../hooks/useConnect', () => ({
  useConnect: () => ({
    connect: vi.fn(),
    connectAsync: vi.fn(),
    connectors: [],
    reset: vi.fn(),
  }),
}))

vi.mock('wagmi', () => ({
  useAccount: () => ({ connector: undefined, isConnected: false, address: undefined }),
  useChainId: () => MOCK_CHAIN_ID,
  useConfig: () => ({ chains: [] }),
  useDisconnect: () => ({ disconnect: vi.fn(), disconnectAsync: vi.fn() }),
  useSwitchChain: () => ({ switchChainAsync: vi.fn() }),
}))

vi.mock('@wagmi/core', () => ({
  getConnectors: () => [],
}))

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>()
  return {
    ...actual,
    useQueryClient: () => ({
      ensureQueryData: vi.fn().mockResolvedValue([]),
    }),
  }
})

// Import the hook under test after mocks are set up
const { useWallets } = await import('../hooks/openfort/useWallets')

describe('useWallets — createWallet', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockClient.getAccessToken.mockResolvedValue(MOCK_ACCESS_TOKEN)
    mockClient.user.get.mockResolvedValue({ id: MOCK_USER_ID, email: 'test@example.com' })
    mockClient.embeddedWallet.create.mockResolvedValue(createMockEmbeddedAccount())
    Object.assign(mockWalletConfig, {
      createEncryptedSessionEndpoint: 'https://example.com/session',
      getEncryptionSession: undefined,
      accountType: AccountTypeEnum.SMART_ACCOUNT,
      requestWalletRecoverOTP: undefined,
      requestWalletRecoverOTPEndpoint: undefined,
    })
  })

  // --- Happy paths ---

  it('creates EOA wallet with Automatic recovery — no chainId in create call', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ session: MOCK_ENCRYPTION_SESSION }),
    })

    const eoaAccount = createMockEmbeddedAccount({
      accountType: AccountTypeEnum.EOA,
      chainId: undefined,
    })
    mockClient.embeddedWallet.create.mockResolvedValue(eoaAccount)

    const { result } = renderHook(() => useWallets(), { wrapper: createTestWrapper() })

    let createResult: Awaited<ReturnType<typeof result.current.createWallet>>
    await act(async () => {
      createResult = await result.current.createWallet({
        recovery: { recoveryMethod: RecoveryMethod.AUTOMATIC },
        accountType: AccountTypeEnum.EOA,
      })
    })

    expect(mockClient.embeddedWallet.create).toHaveBeenCalledWith(
      expect.objectContaining({
        accountType: AccountTypeEnum.EOA,
        chainType: ChainTypeEnum.EVM,
        recoveryParams: expect.objectContaining({
          recoveryMethod: RecoveryMethod.AUTOMATIC,
        }),
      })
    )

    // EOA should NOT include chainId
    const createCall = mockClient.embeddedWallet.create.mock.calls[0][0]
    expect(createCall.chainId).toBeUndefined()
    expect(createResult!.wallet).toBeDefined()
    expect(createResult!.error).toBeUndefined()
  })

  it('creates Smart Account with Automatic recovery — chainId included', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ session: MOCK_ENCRYPTION_SESSION }),
    })

    const { result } = renderHook(() => useWallets(), { wrapper: createTestWrapper() })

    await act(async () => {
      await result.current.createWallet({
        recovery: { recoveryMethod: RecoveryMethod.AUTOMATIC },
        accountType: AccountTypeEnum.SMART_ACCOUNT,
      })
    })

    const createCall = mockClient.embeddedWallet.create.mock.calls[0][0]
    expect(createCall.chainId).toBe(MOCK_CHAIN_ID)
    expect(createCall.accountType).toBe(AccountTypeEnum.SMART_ACCOUNT)
  })

  it('creates Delegated Account with Automatic recovery — chainId included', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ session: MOCK_ENCRYPTION_SESSION }),
    })

    const delegatedAccount = createMockEmbeddedAccount({
      accountType: AccountTypeEnum.DELEGATED_ACCOUNT,
    })
    mockClient.embeddedWallet.create.mockResolvedValue(delegatedAccount)

    const { result } = renderHook(() => useWallets(), { wrapper: createTestWrapper() })

    await act(async () => {
      await result.current.createWallet({
        recovery: { recoveryMethod: RecoveryMethod.AUTOMATIC },
        accountType: AccountTypeEnum.DELEGATED_ACCOUNT,
      })
    })

    const createCall = mockClient.embeddedWallet.create.mock.calls[0][0]
    expect(createCall.chainId).toBe(MOCK_CHAIN_ID)
    expect(createCall.accountType).toBe(AccountTypeEnum.DELEGATED_ACCOUNT)
  })

  it('creates wallet with Password recovery — password in recoveryParams', async () => {
    const { result } = renderHook(() => useWallets(), { wrapper: createTestWrapper() })

    await act(async () => {
      await result.current.createWallet({
        recovery: { recoveryMethod: RecoveryMethod.PASSWORD, password: 'test-password-123' },
      })
    })

    expect(mockClient.embeddedWallet.create).toHaveBeenCalledWith(
      expect.objectContaining({
        recoveryParams: expect.objectContaining({
          recoveryMethod: RecoveryMethod.PASSWORD,
          password: 'test-password-123',
        }),
      })
    )
  })

  it('creates wallet with Passkey recovery — PASSKEY in params', async () => {
    const { result } = renderHook(() => useWallets(), { wrapper: createTestWrapper() })

    await act(async () => {
      await result.current.createWallet({
        recovery: { recoveryMethod: RecoveryMethod.PASSKEY },
      })
    })

    expect(mockClient.embeddedWallet.create).toHaveBeenCalledWith(
      expect.objectContaining({
        recoveryParams: expect.objectContaining({
          recoveryMethod: RecoveryMethod.PASSKEY,
        }),
      })
    )
  })

  // --- Edge cases ---

  it('returns error "Openfort access token not found" without access token', async () => {
    mockClient.getAccessToken.mockResolvedValue(null)

    const { result } = renderHook(() => useWallets(), { wrapper: createTestWrapper() })

    let createResult: Awaited<ReturnType<typeof result.current.createWallet>>
    await act(async () => {
      createResult = await result.current.createWallet()
    })

    expect(createResult!.error).toBeDefined()
    expect(createResult!.error!.message).toBe('Openfort access token not found')
  })

  it('returns error "Please enter your password" with Password but no password string', async () => {
    const { result } = renderHook(() => useWallets(), { wrapper: createTestWrapper() })

    let createResult: Awaited<ReturnType<typeof result.current.createWallet>>
    await act(async () => {
      createResult = await result.current.createWallet({
        recovery: { recoveryMethod: RecoveryMethod.PASSWORD },
      })
    })

    expect(createResult!.error).toBeDefined()
    expect(createResult!.error!.message).toBe('Please enter your password')
  })

  it('propagates error when encryption session endpoint fails', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'server_error' }),
    })

    const { result } = renderHook(() => useWallets(), { wrapper: createTestWrapper() })

    let createResult: Awaited<ReturnType<typeof result.current.createWallet>>
    await act(async () => {
      createResult = await result.current.createWallet({
        recovery: { recoveryMethod: RecoveryMethod.AUTOMATIC },
      })
    })

    expect(createResult!.error).toBeDefined()
    expect(createResult!.error!.message).toContain('Failed to create encryption session')
  })

  it('returns isOTPRequired when OTP_REQUIRED and no OTP config', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'OTP_REQUIRED' }),
    })

    const { result } = renderHook(() => useWallets(), { wrapper: createTestWrapper() })

    let createResult: Awaited<ReturnType<typeof result.current.createWallet>>
    await act(async () => {
      createResult = await result.current.createWallet({
        recovery: { recoveryMethod: RecoveryMethod.AUTOMATIC },
      })
    })

    expect(createResult!.isOTPRequired).toBe(true)
    expect(createResult!.error!.message).toContain('Please set requestWalletRecoverOTP')
  })

  it('returns isOTPRequired with simpler message when OTP config exists', async () => {
    mockWalletConfig.requestWalletRecoverOTPEndpoint = 'https://example.com/otp'

    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('session')) {
        return Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ error: 'OTP_REQUIRED' }),
        })
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
    })

    const { result } = renderHook(() => useWallets(), { wrapper: createTestWrapper() })

    let createResult: Awaited<ReturnType<typeof result.current.createWallet>>
    await act(async () => {
      createResult = await result.current.createWallet({
        recovery: { recoveryMethod: RecoveryMethod.AUTOMATIC },
      })
    })

    expect(createResult!.isOTPRequired).toBe(true)
    expect(createResult!.error!.message).toBe('OTP code is required to recover the wallet.')
    expect(createResult!.error!.message).not.toContain('Please set')
  })

  it('sets status to creating then error on failure', async () => {
    mockClient.getAccessToken.mockResolvedValue(null)

    const { result } = renderHook(() => useWallets(), { wrapper: createTestWrapper() })

    await act(async () => {
      await result.current.createWallet()
    })

    expect(mockSetStatus).toHaveBeenCalledWith({ status: 'creating' })
    expect(mockSetStatus).toHaveBeenCalledWith(expect.objectContaining({ status: 'error' }))
  })

  it('sets status to creating then success on success', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ session: MOCK_ENCRYPTION_SESSION }),
    })

    const { result } = renderHook(() => useWallets(), { wrapper: createTestWrapper() })

    await act(async () => {
      await result.current.createWallet({
        recovery: { recoveryMethod: RecoveryMethod.AUTOMATIC },
      })
    })

    expect(mockSetStatus).toHaveBeenCalledWith({ status: 'creating' })
    expect(mockSetStatus).toHaveBeenCalledWith({ status: 'success' })
  })

  it('calls updateEmbeddedAccounts after successful creation', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ session: MOCK_ENCRYPTION_SESSION }),
    })

    const { result } = renderHook(() => useWallets(), { wrapper: createTestWrapper() })

    await act(async () => {
      await result.current.createWallet({
        recovery: { recoveryMethod: RecoveryMethod.AUTOMATIC },
      })
    })

    expect(mockUpdateEmbeddedAccounts).toHaveBeenCalled()
  })

  it('defaults accountType from walletConfig when not specified', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ session: MOCK_ENCRYPTION_SESSION }),
    })

    mockWalletConfig.accountType = AccountTypeEnum.DELEGATED_ACCOUNT

    const { result } = renderHook(() => useWallets(), { wrapper: createTestWrapper() })

    await act(async () => {
      await result.current.createWallet({
        recovery: { recoveryMethod: RecoveryMethod.AUTOMATIC },
      })
    })

    const createCall = mockClient.embeddedWallet.create.mock.calls[0][0]
    expect(createCall.accountType).toBe(AccountTypeEnum.DELEGATED_ACCOUNT)
  })
})
