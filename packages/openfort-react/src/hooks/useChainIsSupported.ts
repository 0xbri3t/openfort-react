import type { ConnectionStrategy } from '../core/ConnectionStrategy'
import { useConnectionStrategy } from '../core/ConnectionStrategyContext'
import { useEVMBridge } from '../core/OpenfortEVMBridgeContext'
import { useChains } from './useChains'

/**
 * When strategy is embedded, a chain is supported if it is in the configured chain list
 * (walletConfig.ethereum.rpcUrls + default). When strategy is bridge, use bridge config chains.
 */
export function useChainIsSupported(chainId?: number, strategy?: ConnectionStrategy | null): boolean {
  const strategyFromContext = useConnectionStrategy()
  const bridge = useEVMBridge()
  const configuredChains = useChains()
  const s = strategy ?? strategyFromContext

  if (chainId === undefined || chainId === null) return false

  if (s?.kind === 'embedded') {
    return configuredChains.some((c) => c.id === chainId)
  }

  const bridgeChains = bridge?.config?.chains
  if (!bridgeChains) return false
  return bridgeChains.some((x) => x.id === chainId)
}
