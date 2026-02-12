import type { Openfort, OpenfortSDKConfiguration } from '@openfort/openfort-js'

import type { SolanaConfig } from '../solana/types'

export type CoreProviderConfig = {
  publishableKey: string
  shieldPublishableKey?: string
  rpcUrls?: {
    ethereum?: Record<number, string>
    solana?: Partial<Record<'mainnet-beta' | 'devnet' | 'testnet', string>>
  }
  solana?: SolanaConfig
  ethereumPolicyId?: string | Record<number, string>
  debug?: boolean
}

export type OpenfortConfig = CoreProviderConfig & {
  _sdkConfig: OpenfortSDKConfiguration
}

export type CoreContextValue = {
  client: Openfort
  config: OpenfortConfig
  debug: boolean
}

export type WalletReadiness = 'not-created' | 'needs-recovery' | 'ready' | 'loading'
