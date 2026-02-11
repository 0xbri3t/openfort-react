import type { ChainTypeEnum, EmbeddedAccount } from '@openfort/openfort-js'
import type { OpenfortWalletConfig } from '../components/Openfort/types'

export function firstEmbeddedAddress(
  accounts: EmbeddedAccount[] | undefined,
  chainType: ChainTypeEnum
): string | undefined {
  if (!accounts?.length) return undefined
  const acc = accounts.find((a) => a.chainType === chainType)
  return acc?.address
}

export function resolveEthereumPolicy(
  config: OpenfortWalletConfig | undefined,
  chainId: number
): { policy: string } | undefined {
  const policy = config?.ethereumProviderPolicyId
  if (!policy) return undefined
  if (typeof policy === 'string') return { policy }
  if (typeof policy === 'object' && chainId in policy) {
    return { policy: (policy as Record<number, string>)[chainId] }
  }
  return undefined
}
