import type { ChainTypeEnum, EmbeddedAccount, Openfort, User } from '@openfort/openfort-js'
import type { OpenfortWalletConfig } from '../components/Openfort/types'
import type { WalletProps } from '../wallets/useEVMConnectors'

/** Default chain when EVM without Wagmi and walletConfig.ethereum.chainId is missing. Sepolia. */
export const DEFAULT_DEV_CHAIN_ID = 11155111

export interface ConnectionStrategyState {
  user: User | null
  embeddedAccounts: EmbeddedAccount[] | undefined
  chainType: ChainTypeEnum
}

export type ConnectRoute = 'embedded' | 'external-wallets'

export interface ConnectionStrategy {
  readonly kind: 'bridge' | 'embedded'
  readonly chainType: ChainTypeEnum

  isConnected(state: ConnectionStrategyState): boolean
  getChainId(): number | undefined
  getAddress(state: ConnectionStrategyState): string | undefined
  /** When 'external-wallets', ConnectModal may show Connectors page; when 'embedded' only, skip to providers. */
  getConnectRoutes(): ConnectRoute[]
  /** External wallet connectors; only when wagmi/bridge exists. Otherwise []. */
  getConnectors(): WalletProps[]

  initProvider(openfort: Openfort, walletConfig: OpenfortWalletConfig): Promise<void>
  disconnect(openfort: Openfort): Promise<void>
}
