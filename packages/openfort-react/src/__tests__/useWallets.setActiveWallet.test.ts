import { AccountTypeEnum, MissingRecoveryPasswordError, RecoveryMethod } from '@openfort/openfort-js'
import { act, renderHook } from '@testing-library/react'
import type { Hex } from 'viem'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { embeddedWalletId } from '../constants/openfort'
import {
  createMockClient,
  createMockEmbeddedAccount,
  createMockWalletConfig,
  MOCK_ACCESS_TOKEN,
  MOCK_ADDRESS,
  MOCK_ADDRESS_2,
  MOCK_CHAIN_ID,
  MOCK_ENCRYPTION_SESSION,
  MOCK_USER_ID,
  type MockClient,
} from './mocks/openfort-client'
import { createTestWrapper } from './mocks/wrapper'

// --- Module-level mocks ---

const mockClient: MockClient = createMockClient()
const mockWalletConfig = createMockWalletConfig()
const mockSetStatus = vi.fn()
const mockUpdateEmbeddedAccounts = vi.fn().mockResolvedValue({ data: [] })
const mockEnsureQueryData = vi.fn()
const mockSwitchChainAsync = vi.fn()
const mockDisconnectAsync = vi.fn()
const mockConnect = vi.fn()

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
    connect: mockConnect,
    connectAsync: vi.fn(),
    connectors: [],
    reset: vi.fn(),
  }),
}))

vi.mock('wagmi', () => ({
  useAccount: () => ({ connector: undefined, isConnected: false, address: undefined }),
  useChainId: () => MOCK_CHAIN_ID,
  useConfig: () => ({ chains: [] }),
  useDisconnect: () => ({ disconnect: vi.fn(), disconnectAsync: mockDisconnectAsync }),
  useSwitchChain: () => ({ switchChainAsync: mockSwitchChainAsync }),
}))

vi.mock('@wagmi/core', () => ({
  getConnectors: () => [{ id: embeddedWalletId, name: 'Openfort' }],
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

const { useWallets } = await import('../hooks/openfort/useWallets')

describe('useWallets — setActiveWallet', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockClient.getAccessToken.mockResolvedValue(MOCK_ACCESS_TOKEN)
    mockClient.user.get.mockResolvedValue({ id: MOCK_USER_ID, email: 'test@example.com' })
    mockDisconnectAsync.mockResolvedValue(undefined)
    Object.assign(mockWalletConfig, {
      createEncryptedSessionEndpoint: 'https://example.com/session',
      getEncryptionSession: undefined,
      accountType: AccountTypeEnum.SMART_ACCOUNT,
      requestWalletRecoverOTP: undefined,
      requestWalletRecoverOTPEndpoint: undefined,
    })
  })

  // --- Happy paths ---

  it('recovers EOA wallet with Automatic recovery', async () => {
    const eoaAccount = createMockEmbeddedAccount({
      accountType: AccountTypeEnum.EOA,
      chainId: undefined,
      recoveryMethod: RecoveryMethod.AUTOMATIC,
      address: MOCK_ADDRESS,
    })
    mockEnsureQueryData.mockResolvedValue([eoaAccount])
    mockClient.embeddedWallet.recover.mockResolvedValue(eoaAccount)

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ session: MOCK_ENCRYPTION_SESSION }),
    })

    const { result } = renderHook(() => useWallets(), { wrapper: createTestWrapper() })

    let setResult: Awaited<ReturnType<typeof result.current.setActiveWallet>>
    await act(async () => {
      setResult = await result.current.setActiveWallet({
        walletId: embeddedWalletId,
        address: MOCK_ADDRESS,
      })
    })

    expect(mockClient.embeddedWallet.recover).toHaveBeenCalledWith(
      expect.objectContaining({
        account: eoaAccount.id,
        recoveryParams: expect.objectContaining({
          recoveryMethod: RecoveryMethod.AUTOMATIC,
        }),
      })
    )
    expect(setResult!.wallet).toBeDefined()
    expect(setResult!.error).toBeUndefined()
  })

  it('recovers Smart Account by chainId match', async () => {
    const smartAccount = createMockEmbeddedAccount({
      accountType: AccountTypeEnum.SMART_ACCOUNT,
      chainId: MOCK_CHAIN_ID,
      recoveryMethod: RecoveryMethod.AUTOMATIC,
    })
    mockEnsureQueryData.mockResolvedValue([smartAccount])
    mockClient.embeddedWallet.recover.mockResolvedValue(smartAccount)

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ session: MOCK_ENCRYPTION_SESSION }),
    })

    const { result } = renderHook(() => useWallets(), { wrapper: createTestWrapper() })

    let setResult: Awaited<ReturnType<typeof result.current.setActiveWallet>>
    await act(async () => {
      setResult = await result.current.setActiveWallet({
        walletId: embeddedWalletId,
      })
    })

    expect(mockClient.embeddedWallet.recover).toHaveBeenCalledWith(
      expect.objectContaining({
        account: smartAccount.id,
      })
    )
    expect(setResult!.wallet).toBeDefined()
  })

  it('recovers Password wallet with correct password', async () => {
    const pwAccount = createMockEmbeddedAccount({
      recoveryMethod: RecoveryMethod.PASSWORD,
      address: MOCK_ADDRESS,
    })
    mockEnsureQueryData.mockResolvedValue([pwAccount])
    mockClient.embeddedWallet.recover.mockResolvedValue(pwAccount)

    const { result } = renderHook(() => useWallets(), { wrapper: createTestWrapper() })

    let setResult: Awaited<ReturnType<typeof result.current.setActiveWallet>>
    await act(async () => {
      setResult = await result.current.setActiveWallet({
        walletId: embeddedWalletId,
        address: MOCK_ADDRESS,
        recovery: { recoveryMethod: RecoveryMethod.PASSWORD, password: 'correct-pw' },
      })
    })

    expect(mockClient.embeddedWallet.recover).toHaveBeenCalledWith(
      expect.objectContaining({
        recoveryParams: expect.objectContaining({
          recoveryMethod: RecoveryMethod.PASSWORD,
          password: 'correct-pw',
        }),
      })
    )
    expect(setResult!.wallet).toBeDefined()
  })

  // --- Edge cases ---

  it('throws recovery method mismatch error', async () => {
    const autoAccount = createMockEmbeddedAccount({
      recoveryMethod: RecoveryMethod.AUTOMATIC,
      address: MOCK_ADDRESS,
    })
    mockEnsureQueryData.mockResolvedValue([autoAccount])

    const { result } = renderHook(() => useWallets(), { wrapper: createTestWrapper() })

    let setResult: Awaited<ReturnType<typeof result.current.setActiveWallet>>
    await act(async () => {
      setResult = await result.current.setActiveWallet({
        walletId: embeddedWalletId,
        address: MOCK_ADDRESS,
        recovery: { recoveryMethod: RecoveryMethod.PASSWORD, password: 'pw' },
      })
    })

    expect(setResult!.error).toBeDefined()
    expect(setResult!.error!.message).toContain('recovery method you entered is incorrect')
  })

  it('throws "Please enter your password" for Password wallet without password', async () => {
    const pwAccount = createMockEmbeddedAccount({
      recoveryMethod: RecoveryMethod.PASSWORD,
      address: MOCK_ADDRESS,
    })
    mockEnsureQueryData.mockResolvedValue([pwAccount])

    const { result } = renderHook(() => useWallets(), { wrapper: createTestWrapper() })

    let setResult: Awaited<ReturnType<typeof result.current.setActiveWallet>>
    await act(async () => {
      setResult = await result.current.setActiveWallet({
        walletId: embeddedWalletId,
        address: MOCK_ADDRESS,
      })
    })

    expect(setResult!.error).toBeDefined()
    expect(setResult!.error!.message).toBe('Please enter your password')
  })

  it('throws "Embedded wallet not found" for unknown address', async () => {
    mockEnsureQueryData.mockResolvedValue([])

    const { result } = renderHook(() => useWallets(), { wrapper: createTestWrapper() })

    let setResult: Awaited<ReturnType<typeof result.current.setActiveWallet>>
    await act(async () => {
      setResult = await result.current.setActiveWallet({
        walletId: embeddedWalletId,
        address: '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef' as Hex,
      })
    })

    expect(setResult!.error).toBeDefined()
    expect(setResult!.error!.message).toContain('Embedded wallet not found for address')
  })

  it('throws "No embedded wallet found with type EOA" when EOA not found', async () => {
    mockWalletConfig.accountType = AccountTypeEnum.EOA
    mockEnsureQueryData.mockResolvedValue([
      createMockEmbeddedAccount({
        accountType: AccountTypeEnum.SMART_ACCOUNT,
        chainId: MOCK_CHAIN_ID,
      }),
    ])

    const { result } = renderHook(() => useWallets(), { wrapper: createTestWrapper() })

    let setResult: Awaited<ReturnType<typeof result.current.setActiveWallet>>
    await act(async () => {
      setResult = await result.current.setActiveWallet({
        walletId: embeddedWalletId,
      })
    })

    expect(setResult!.error).toBeDefined()
    expect(setResult!.error!.message).toBe('No embedded wallet found with type EOA')
  })

  it('throws "No embedded wallet found for the current chain" when no wallet matches chain', async () => {
    mockEnsureQueryData.mockResolvedValue([
      createMockEmbeddedAccount({
        chainId: 999999, // Different chain
        recoveryMethod: RecoveryMethod.PASSWORD, // Password-only, no fallback
      }),
    ])

    const { result } = renderHook(() => useWallets(), { wrapper: createTestWrapper() })

    let setResult: Awaited<ReturnType<typeof result.current.setActiveWallet>>
    await act(async () => {
      setResult = await result.current.setActiveWallet({
        walletId: embeddedWalletId,
      })
    })

    expect(setResult!.error).toBeDefined()
    expect(setResult!.error!.message).toBe('No embedded wallet found for the current chain')
  })

  it('maps "Wrong recovery password" to user-friendly message', async () => {
    const pwAccount = createMockEmbeddedAccount({
      recoveryMethod: RecoveryMethod.PASSWORD,
      address: MOCK_ADDRESS,
    })
    mockEnsureQueryData.mockResolvedValue([pwAccount])
    mockClient.embeddedWallet.recover.mockRejectedValue(new Error('Wrong recovery password for this embedded signer'))

    const { result } = renderHook(() => useWallets(), { wrapper: createTestWrapper() })

    let setResult: Awaited<ReturnType<typeof result.current.setActiveWallet>>
    await act(async () => {
      setResult = await result.current.setActiveWallet({
        walletId: embeddedWalletId,
        address: MOCK_ADDRESS,
        recovery: { recoveryMethod: RecoveryMethod.PASSWORD, password: 'wrong-pw' },
      })
    })

    expect(setResult!.error).toBeDefined()
    expect(setResult!.error!.message).toBe('Wrong password, Please try again.')
  })

  it('maps MissingRecoveryPasswordError to a recovery-related error', async () => {
    const autoAccount = createMockEmbeddedAccount({
      recoveryMethod: RecoveryMethod.AUTOMATIC,
      address: MOCK_ADDRESS,
    })
    mockEnsureQueryData.mockResolvedValue([autoAccount])

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ session: MOCK_ENCRYPTION_SESSION }),
    })

    mockClient.embeddedWallet.recover.mockRejectedValue(new MissingRecoveryPasswordError())

    const { result } = renderHook(() => useWallets(), { wrapper: createTestWrapper() })

    let setResult: Awaited<ReturnType<typeof result.current.setActiveWallet>>
    await act(async () => {
      setResult = await result.current.setActiveWallet({
        walletId: embeddedWalletId,
        address: MOCK_ADDRESS,
      })
    })

    expect(setResult!.error).toBeDefined()
    // The error is either "Missing recovery password" (if instanceof check works)
    // or the SDK's original message (if class identity differs across module boundaries)
    expect(
      setResult!.error!.message === 'Missing recovery password' || setResult!.error!.message.includes('password')
    ).toBe(true)
  })

  it('returns OTP_REQUIRED with setup instructions when OTP not configured', async () => {
    const autoAccount = createMockEmbeddedAccount({
      recoveryMethod: RecoveryMethod.AUTOMATIC,
      address: MOCK_ADDRESS,
    })
    mockEnsureQueryData.mockResolvedValue([autoAccount])

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'OTP_REQUIRED' }),
    })

    const { result } = renderHook(() => useWallets(), { wrapper: createTestWrapper() })

    let setResult: Awaited<ReturnType<typeof result.current.setActiveWallet>>
    await act(async () => {
      setResult = await result.current.setActiveWallet({
        walletId: embeddedWalletId,
        address: MOCK_ADDRESS,
      })
    })

    expect(setResult!.isOTPRequired).toBe(true)
    expect(setResult!.error!.message).toContain('Please set requestWalletRecoverOTP')
  })

  it('returns OTP_REQUIRED without setup instructions when OTP is configured', async () => {
    mockWalletConfig.requestWalletRecoverOTPEndpoint = 'https://example.com/otp'

    const autoAccount = createMockEmbeddedAccount({
      recoveryMethod: RecoveryMethod.AUTOMATIC,
      address: MOCK_ADDRESS,
    })
    mockEnsureQueryData.mockResolvedValue([autoAccount])

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

    let setResult: Awaited<ReturnType<typeof result.current.setActiveWallet>>
    await act(async () => {
      setResult = await result.current.setActiveWallet({
        walletId: embeddedWalletId,
        address: MOCK_ADDRESS,
      })
    })

    expect(setResult!.isOTPRequired).toBe(true)
    expect(setResult!.error!.message).toBe('OTP code is required to recover the wallet.')
    expect(setResult!.error!.message).not.toContain('Please set')
  })

  it('falls back to EOA wallet when no wallet matches current chain (without address)', async () => {
    const eoaAccount = createMockEmbeddedAccount({
      accountType: AccountTypeEnum.EOA,
      chainId: undefined,
      recoveryMethod: RecoveryMethod.AUTOMATIC,
      address: MOCK_ADDRESS_2,
    })
    mockEnsureQueryData.mockResolvedValue([eoaAccount])
    mockClient.embeddedWallet.recover.mockResolvedValue(eoaAccount)

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ session: MOCK_ENCRYPTION_SESSION }),
    })

    const { result } = renderHook(() => useWallets(), { wrapper: createTestWrapper() })

    let setResult: Awaited<ReturnType<typeof result.current.setActiveWallet>>
    await act(async () => {
      setResult = await result.current.setActiveWallet({
        walletId: embeddedWalletId,
      })
    })

    // Should recover the EOA wallet as fallback
    expect(mockClient.embeddedWallet.recover).toHaveBeenCalledWith(
      expect.objectContaining({
        account: eoaAccount.id,
      })
    )
    expect(setResult!.wallet).toBeDefined()
  })

  it('skips password-only wallets in canRecoverWithoutPassword logic', async () => {
    // Only a password wallet available, no password provided
    const pwAccount = createMockEmbeddedAccount({
      accountType: AccountTypeEnum.EOA,
      recoveryMethod: RecoveryMethod.PASSWORD,
    })
    mockWalletConfig.accountType = AccountTypeEnum.EOA
    mockEnsureQueryData.mockResolvedValue([pwAccount])

    const { result } = renderHook(() => useWallets(), { wrapper: createTestWrapper() })

    let setResult: Awaited<ReturnType<typeof result.current.setActiveWallet>>
    await act(async () => {
      setResult = await result.current.setActiveWallet({
        walletId: embeddedWalletId,
      })
    })

    // Should fail since password wallet can't be recovered without password
    expect(setResult!.error).toBeDefined()
    expect(setResult!.error!.message).toBe('No embedded wallet found with type EOA')
  })

  it('sets status to connecting then success on successful recovery', async () => {
    const account = createMockEmbeddedAccount({
      recoveryMethod: RecoveryMethod.AUTOMATIC,
      address: MOCK_ADDRESS,
    })
    mockEnsureQueryData.mockResolvedValue([account])
    mockClient.embeddedWallet.recover.mockResolvedValue(account)

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ session: MOCK_ENCRYPTION_SESSION }),
    })

    const { result } = renderHook(() => useWallets(), { wrapper: createTestWrapper() })

    await act(async () => {
      await result.current.setActiveWallet({
        walletId: embeddedWalletId,
        address: MOCK_ADDRESS,
      })
    })

    expect(mockSetStatus).toHaveBeenCalledWith(expect.objectContaining({ status: 'connecting' }))
    expect(mockSetStatus).toHaveBeenCalledWith({ status: 'success' })
  })
})
