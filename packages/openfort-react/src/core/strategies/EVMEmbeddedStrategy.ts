import { ChainTypeEnum, type EmbeddedAccount, type Openfort } from '@openfort/openfort-js'
import type { OpenfortWalletConfig } from '../../components/Openfort/types'
import { logger } from '../../utils/logger'
import type { ConnectionStrategy, ConnectionStrategyState } from '../ConnectionStrategy'
import { DEFAULT_DEV_CHAIN_ID } from '../ConnectionStrategy'

function firstEVMAddress(accounts: EmbeddedAccount[] | undefined): string | undefined {
  if (!accounts?.length) return undefined
  const evm = accounts.find((a) => a.chainType === ChainTypeEnum.EVM)
  return evm?.address
}

function hasEmbeddedEVM(state: ConnectionStrategyState): boolean {
  if (!state.user) return false
  const addr = firstEVMAddress(state.embeddedAccounts)
  return !!addr
}

export function createEVMEmbeddedStrategy(walletConfig: OpenfortWalletConfig | undefined): ConnectionStrategy {
  const chainId = walletConfig?.ethereum?.chainId
  const effectiveChainId =
    chainId ??
    (() => {
      logger.warn(
        '[@openfort/react] EVM without Wagmi: no walletConfig.ethereum.chainId. Using development chain default (Sepolia). Set walletConfig.ethereum.chainId for production.'
      )
      return DEFAULT_DEV_CHAIN_ID
    })()

  return {
    kind: 'embedded',
    chainType: ChainTypeEnum.EVM,

    isConnected(state) {
      return hasEmbeddedEVM(state)
    },

    getChainId() {
      return effectiveChainId
    },

    getAddress(state) {
      return firstEVMAddress(state.embeddedAccounts)
    },

    getConnectRoutes() {
      return ['embedded']
    },

    getConnectors() {
      return []
    },

    async initProvider(openfort: Openfort, config: OpenfortWalletConfig) {
      const ethereum = config?.ethereum
      const chainId = ethereum?.chainId ?? DEFAULT_DEV_CHAIN_ID
      const rpcUrls = ethereum?.rpcUrls ?? {}
      const policy = config?.ethereumProviderPolicyId
      const policyObj =
        typeof policy === 'string'
          ? { policy }
          : policy && typeof policy === 'object' && chainId in policy
            ? { policy: (policy as Record<number, string>)[chainId] }
            : undefined
      await openfort.embeddedWallet.getEthereumProvider({
        ...policyObj,
        chains: rpcUrls,
      })
    },

    async disconnect(openfort: Openfort) {
      await openfort.auth.logout()
    },
  }
}
