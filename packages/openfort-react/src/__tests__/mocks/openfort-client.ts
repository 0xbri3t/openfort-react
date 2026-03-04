import type { EmbeddedAccount } from '@openfort/openfort-js'
import { AccountTypeEnum, EmbeddedState, RecoveryMethod } from '@openfort/openfort-js'
import type { Hex } from 'viem'
import type { Mock } from 'vitest'
import { vi } from 'vitest'

export const MOCK_ADDRESS = '0x1234567890abcdef1234567890abcdef12345678' as Hex
export const MOCK_ADDRESS_2 = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd' as Hex
export const MOCK_USER_ID = 'usr_test_123'
export const MOCK_ACCESS_TOKEN = 'test-access-token'
export const MOCK_ENCRYPTION_SESSION = 'test-encryption-session'
export const MOCK_CHAIN_ID = 80002

export function createMockEmbeddedAccount(overrides: Partial<EmbeddedAccount> = {}): EmbeddedAccount {
  return {
    id: 'emb_test_123',
    address: MOCK_ADDRESS,
    chainId: MOCK_CHAIN_ID,
    recoveryMethod: RecoveryMethod.AUTOMATIC,
    accountType: AccountTypeEnum.SMART_ACCOUNT,
    ownerAddress: MOCK_ADDRESS,
    createdAt: Date.now(),
    ...overrides,
  } as EmbeddedAccount
}

export type MockClient = {
  embeddedWallet: {
    create: Mock
    list: Mock
    recover: Mock
    get: Mock
    getEmbeddedState: Mock
    getEthereumProvider: Mock
    setRecoveryMethod: Mock
    exportPrivateKey: Mock
  }
  user: {
    get: Mock
  }
  getAccessToken: Mock
  auth: {
    logout: Mock
  }
}

export function createMockClient(): MockClient {
  return {
    embeddedWallet: {
      create: vi.fn().mockResolvedValue(createMockEmbeddedAccount()),
      list: vi.fn().mockResolvedValue([createMockEmbeddedAccount()]),
      recover: vi.fn().mockResolvedValue(createMockEmbeddedAccount()),
      get: vi.fn().mockResolvedValue(createMockEmbeddedAccount()),
      getEmbeddedState: vi.fn().mockResolvedValue(EmbeddedState.READY),
      getEthereumProvider: vi.fn(),
      setRecoveryMethod: vi.fn().mockResolvedValue(undefined),
      exportPrivateKey: vi.fn().mockResolvedValue('0xprivatekey'),
    },
    user: {
      get: vi.fn().mockResolvedValue({
        id: MOCK_USER_ID,
        email: 'test@example.com',
        phoneNumber: undefined,
        linkedAccounts: [],
      }),
    },
    getAccessToken: vi.fn().mockResolvedValue(MOCK_ACCESS_TOKEN),
    auth: {
      logout: vi.fn().mockResolvedValue(undefined),
    },
  }
}

export function createMockWalletConfig(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    createEncryptedSessionEndpoint: 'https://example.com/session',
    accountType: AccountTypeEnum.SMART_ACCOUNT,
    recoverWalletAutomaticallyAfterAuth: true,
    ...overrides,
  }
}
