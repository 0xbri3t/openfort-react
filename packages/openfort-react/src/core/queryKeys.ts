/**
 * Central query key factory for TanStack Query.
 * Use for cache keys and invalidation.
 */

export const queryKeys = {
  accounts: {
    all: () => ['openfort', 'accounts'] as const,
    embedded: (accountType?: string) => [...queryKeys.accounts.all(), 'embedded', accountType ?? 'all'] as const,
  },
  auth: {
    all: () => ['openfort', 'auth'] as const,
    user: () => [...queryKeys.auth.all(), 'user'] as const,
  },
  solana: {
    all: () => ['openfort', 'solana'] as const,
    balance: (address?: string, rpcUrl?: string, commitment?: string) =>
      [...queryKeys.solana.all(), 'balance', address, rpcUrl, commitment] as const,
  },
  ethereum: {
    all: () => ['openfort', 'ethereum'] as const,
    balance: (address?: string, chainId?: number) =>
      [...queryKeys.ethereum.all(), 'balance', address, chainId] as const,
  },
}

export const authQueryKeys = {
  all: queryKeys.auth.all,
  user: queryKeys.auth.user,
  embeddedAccounts: queryKeys.accounts.embedded,
}
