import { ChainTypeEnum, type Openfort } from '@openfort/openfort-js'
import type { OpenfortWalletConfig } from '../../components/Openfort/types'
import type { WalletProps } from '../../wallets/useEVMConnectors'
import type { ConnectionStrategy } from '../ConnectionStrategy'
import type { OpenfortEVMBridgeValue } from '../OpenfortEVMBridgeContext'
import { resolveEthereumPolicy } from '../strategyUtils'

export function createEthereumBridgeStrategy(
  bridge: OpenfortEVMBridgeValue,
  connectors: WalletProps[]
): ConnectionStrategy {
  return {
    kind: 'bridge',
    chainType: ChainTypeEnum.EVM,

    isConnected(state) {
      return !!(bridge.account.address && state.user)
    },

    getChainId() {
      return bridge.chainId
    },

    getAddress() {
      return bridge.account.address ?? undefined
    },

    getConnectRoutes() {
      return ['embedded', 'external-wallets']
    },

    getConnectors() {
      return connectors
    },

    async initProvider(openfort: Openfort, walletConfig: OpenfortWalletConfig) {
      const chainId = bridge.chainId
      const policyObj = chainId != null ? resolveEthereumPolicy(walletConfig, chainId) : undefined

      const rpcUrls = bridge.config.chains.reduce(
        (acc, ch) => {
          const url = bridge.config.getClient({ chainId: ch.id }).transport?.url
          if (url) acc[ch.id] = url
          return acc
        },
        {} as Record<number, string>
      )

      await openfort.embeddedWallet.getEthereumProvider({
        ...policyObj,
        chains: rpcUrls,
      })
    },

    async disconnect(openfort: Openfort) {
      await bridge.disconnect()
      await openfort.auth.logout()
    },
  }
}
