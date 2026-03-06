import { ChainTypeEnum, EmbeddedState, type Openfort } from '@openfort/openfort-js'
import type { OpenfortWalletConfig } from '../../components/Openfort/types'
import { logger } from '../../utils/logger'
import type { ConnectionStrategy, ConnectionStrategyState } from '../ConnectionStrategy'
import { DEFAULT_DEV_CHAIN_ID } from '../ConnectionStrategy'
import { firstEmbeddedAddress, resolveEthereumPolicy } from '../strategyUtils'

/** Module-level: survives strategy recreation via useMemo. Reset on disconnect. */
let lastInitChainId_embedded: number | undefined

function hasEmbeddedEthereum(state: ConnectionStrategyState): boolean {
  if (!state.user || !state.activeEmbeddedAddress || state.embeddedState !== EmbeddedState.READY) return false
  return (
    state.embeddedAccounts?.some(
      (a) => a.chainType === ChainTypeEnum.EVM && a.address === state.activeEmbeddedAddress
    ) ?? false
  )
}

/**
 * Creates the EVM embedded strategy for SDK-only mode (no wagmi).
 * When getActiveChainId/setActiveChainId are provided, getChainId() returns the active chain for multi-chain.
 *
 * @param walletConfig - Wallet config with ethereum.chainId and rpcUrls
 * @param getActiveChainId - Optional getter for user-selected chain (from provider state)
 * @param setActiveChainId - Optional setter to persist user-selected chain
 */
export function createEthereumEmbeddedStrategy(
  walletConfig: OpenfortWalletConfig | undefined,
  getActiveChainId?: () => number | undefined,
  setActiveChainId?: (chainId: number | undefined) => void
): ConnectionStrategy {
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
      return getActiveChainId?.() ?? effectiveChainId
    },

    getActiveChainId,
    setActiveChainId,

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
      // Skip if the chain hasn't changed since last init to avoid spurious 422s.
      // Also skip if there are no accounts yet — switch-chain requires an initialized account.
      if (chainId !== lastInitChainId_embedded) {
        const accounts = (await provider.request({ method: 'eth_accounts' })) as string[]

        if (accounts.length > 0) {
          try {
            await provider.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: `0x${chainId.toString(16)}` }],
            })
            lastInitChainId_embedded = chainId
          } catch (_switchErr) {}
        }
      }
    },

    async disconnect(openfort: Openfort) {
      lastInitChainId_embedded = undefined
      await openfort.auth.logout()
    },
  }
}
