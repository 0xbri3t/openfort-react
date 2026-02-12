import { RecoveryMethod, type RecoveryParams } from '@openfort/openfort-js'
import type { BuildRecoveryParamsConfig } from '../../shared/utils/recovery'
import { buildRecoveryParams } from '../../shared/utils/recovery'
import type { SetActiveSolanaWalletOptions } from '../types'

export type ResolveRecoveryResult = { needsRecovery: true } | { needsRecovery: false; recoveryParams: RecoveryParams }

export async function resolveRecoveryForSetActive(
  account: { recoveryMethod?: RecoveryMethod },
  activeOptions: SetActiveSolanaWalletOptions,
  config: BuildRecoveryParamsConfig
): Promise<ResolveRecoveryResult> {
  const password = activeOptions.password ?? activeOptions.recoveryPassword
  const hasExplicitRecovery =
    activeOptions.recoveryParams != null || password != null || activeOptions.recoveryMethod !== undefined

  if (activeOptions.recoveryParams) {
    return { needsRecovery: false, recoveryParams: activeOptions.recoveryParams }
  }

  if (!hasExplicitRecovery) {
    const method = account.recoveryMethod ?? RecoveryMethod.AUTOMATIC
    if (method === RecoveryMethod.PASSKEY) {
      return {
        needsRecovery: false,
        recoveryParams: {
          recoveryMethod: RecoveryMethod.PASSKEY,
          ...(activeOptions.passkeyId && { passkeyId: activeOptions.passkeyId }),
        } as RecoveryParams,
      }
    }
    if (method === RecoveryMethod.PASSWORD) {
      return { needsRecovery: true }
    }
    const recoveryParams = await buildRecoveryParams(
      { recoveryMethod: undefined, otpCode: activeOptions.otpCode },
      config
    )
    return { needsRecovery: false, recoveryParams }
  }

  const recoveryParams = await buildRecoveryParams(
    {
      recoveryMethod: activeOptions.recoveryMethod ?? (password != null ? RecoveryMethod.PASSWORD : undefined),
      passkeyId: activeOptions.passkeyId,
      password,
      otpCode: activeOptions.otpCode,
    },
    config
  )
  return { needsRecovery: false, recoveryParams }
}
