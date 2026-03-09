import type { ChainTypeEnum, EmbeddedAccount } from '@openfort/openfort-js'
import { RecoveryMethod } from '@openfort/openfort-js'
import type { OpenfortWalletConfig } from '../components/Openfort/types'

export function firstEmbeddedAddress(
  accounts: EmbeddedAccount[] | undefined,
  chainType: ChainTypeEnum
): string | undefined {
  if (!accounts?.length) return undefined

  const forChain = accounts.filter((a) => a.chainType === chainType)
  if (!forChain.length) return undefined

  const automatic = forChain.find((a) => a.recoveryMethod === RecoveryMethod.AUTOMATIC)
  if (automatic) return automatic.address

  const passkey = forChain.find((a) => a.recoveryMethod === RecoveryMethod.PASSKEY)
  if (passkey) return passkey.address

  return forChain[0].address
}

export function resolveEthereumPolicy(
  config: OpenfortWalletConfig | undefined,
  chainId: number
): { policy: string } | undefined {
  const policy = config?.ethereum?.ethereumProviderPolicyId
  if (!policy) return undefined
  if (typeof policy === 'string') return { policy }
  if (typeof policy === 'object' && chainId in policy) {
    return { policy: (policy as Record<number, string>)[chainId] }
  }
  return undefined
}
