import { ChainTypeEnum, type Openfort } from '@openfort/openfort-js'
import type { OpenfortWalletConfig } from '../../components/Openfort/types'
import { logger } from '../../utils/logger'
import type { ConnectionStrategy, ConnectionStrategyState } from '../ConnectionStrategy'
import { DEFAULT_DEV_CHAIN_ID } from '../ConnectionStrategy'
import { firstEmbeddedAddress, resolveEthereumPolicy } from '../strategyUtils'

function hasEmbeddedEthereum(state: ConnectionStrategyState): boolean {
  if (!state.user) return false
  const addr = firstEmbeddedAddress(state.embeddedAccounts, ChainTypeEnum.EVM)
  return !!addr
}

/**
 * Creates the EVM embedded strategy for SDK-only mode (no wagmi).
 * Uses activeChainId from context for multi-chain.
 *
 * @param walletConfig - Wallet config with ethereum.chainId and rpcUrls
 */
export function createEthereumEmbeddedStrategy(walletConfig: OpenfortWalletConfig | undefined): ConnectionStrategy {
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
      return hasEmbeddedEthereum(state)
    },

    getChainId() {
      return effectiveChainId
    },

    getAddress(state) {
      if (state.activeEmbeddedAddress) return state.activeEmbeddedAddress
      return firstEmbeddedAddress(state.embeddedAccounts, ChainTypeEnum.EVM)
    },

    getConnectRoutes() {
      return ['embedded']
    },

    getConnectors() {
      return []
    },

    async initProvider(openfort: Openfort, config: OpenfortWalletConfig, chainIdOverride?: number) {
      const ethereum = config?.ethereum
      const chainId = chainIdOverride ?? ethereum?.chainId ?? DEFAULT_DEV_CHAIN_ID
      const rpcUrls = ethereum?.rpcUrls ?? {}
      const policyObj = resolveEthereumPolicy(config, chainId)
      const provider = await openfort.embeddedWallet.getEthereumProvider({
        ...policyObj,
        chains: rpcUrls,
      })
      // Tell the provider which chain is active (EIP-1193). Without this, the provider
      // stays on its initial chain (e.g. 80002) while policy resolution is per-chain.
      // Non-fatal: switch-chain can 422 (e.g. validation failed).
      try {
        await provider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: `0x${chainId.toString(16)}` }],
        })
      } catch (switchErr) {
        logger.log('Embedded wallet switch chain failed (non-fatal)', switchErr)
      }
    },

    async disconnect(openfort: Openfort) {
      await openfort.auth.logout()
    },
  }
}
