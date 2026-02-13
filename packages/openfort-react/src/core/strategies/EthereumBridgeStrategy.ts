import { ChainTypeEnum, type Openfort } from '@openfort/openfort-js'
import type { OpenfortWalletConfig } from '../../components/Openfort/types'
import type { OpenfortEthereumBridgeValue } from '../../ethereum/OpenfortEthereumBridgeContext'
import { logger } from '../../utils/logger'
import type { ExternalConnectorProps } from '../../wallets/useExternalConnectors'
import type { ConnectionStrategy } from '../ConnectionStrategy'
import { resolveEthereumPolicy } from '../strategyUtils'

/**
 * Creates the EVM strategy when wagmi bridge is present.
 * Delegates to bridge for account, chain, connectors, and switchChain.
 *
 * @param bridge - Wagmi bridge context value
 * @param connectors - Mapped connector props for the UI
 */
export function createEthereumBridgeStrategy(
  bridge: OpenfortEthereumBridgeValue,
  connectors: ExternalConnectorProps[]
): ConnectionStrategy {
  return {
    kind: 'bridge',
    chainType: ChainTypeEnum.EVM,

    isConnected(state) {
      return !!(bridge.account.isConnected && bridge.account.address && state.user)
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

    async initProvider(openfort: Openfort, walletConfig: OpenfortWalletConfig, chainIdOverride?: number) {
      const chainId = chainIdOverride ?? bridge.chainId
      const policyObj = chainId != null ? resolveEthereumPolicy(walletConfig, chainId) : undefined

      const rpcUrls = bridge.config.chains.reduce(
        (acc, ch) => {
          const url = bridge.config.getClient({ chainId: ch.id }).transport?.url
          if (url) acc[ch.id] = url
          return acc
        },
        {} as Record<number, string>
      )

      const provider = await openfort.embeddedWallet.getEthereumProvider({
        ...policyObj,
        chains: rpcUrls,
        announceProvider: true,
        providerInfo: {
          name: 'Openfort',
          rdns: 'xyz.openfort',
          icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>',
        },
      })
      // Tell the provider which chain is active (EIP-1193). Keeps provider in sync with wagmi.
      // Non-fatal: switch-chain can 422 (e.g. guest with no embedded wallet on that chain).
      if (chainId != null) {
        try {
          await provider.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: `0x${chainId.toString(16)}` }],
          })
        } catch (switchErr) {
          logger.log('Embedded wallet switch chain failed (non-fatal)', switchErr)
        }
      }
    },

    async disconnect(openfort: Openfort) {
      await bridge.disconnect()
      await openfort.auth.logout()
    },
  }
}
