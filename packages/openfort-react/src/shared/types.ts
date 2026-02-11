import type { EmbeddedAccount, RecoveryMethod, RecoveryParams } from '@openfort/openfort-js'
import type { OpenfortHookOptions } from '../types'

export type RecoverableWallet = {
  address: string
  id: string
  recoveryMethod?: RecoveryMethod
  accounts: { id: string }[]
}

export interface BaseWalletActions<
  TWallet,
  TCreateOptions extends object = object,
  TSetActiveOptions extends object = object,
> {
  create(options?: TCreateOptions): Promise<EmbeddedAccount>
  wallets: TWallet[]
  setActive(options: TSetActiveOptions): Promise<void>
  setRecovery(options: SetRecoveryOptions): Promise<void>
  exportPrivateKey(): Promise<string>
}

export type SetRecoveryOptions = {
  previousRecovery: RecoveryParams
  newRecovery: RecoveryParams
}

export type WalletStatus =
  | 'disconnected'
  | 'fetching-wallets'
  | 'connecting'
  | 'reconnecting'
  | 'creating'
  | 'needs-recovery'
  | 'connected'
  | 'error'

export type BaseCreateWalletOptions<TResult> = {
  recoveryPassword?: string
  otpCode?: string
} & OpenfortHookOptions<TResult>

export type BaseSetActiveWalletOptions = {
  recoveryParams?: RecoveryParams
}
