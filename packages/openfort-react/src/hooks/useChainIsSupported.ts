import type { ConnectionStrategy } from '../core/ConnectionStrategy'
import { useConnectionStrategy } from '../core/ConnectionStrategyContext'
import { useEVMBridge } from '../core/OpenfortEVMBridgeContext'

/**
 * When strategy is embedded, the chain is always supported (developer-configured).
 * When strategy is bridge, use bridge config chains. Without strategy, returns false.
 */
export function useChainIsSupported(chainId?: number, strategy?: ConnectionStrategy | null): boolean {
  const strategyFromContext = useConnectionStrategy()
  const bridge = useEVMBridge()
  const s = strategy ?? strategyFromContext

  if (s?.kind === 'embedded') {
    if (chainId === undefined || chainId === null) return false
    return chainId === s.getChainId()
  }

  const chains = bridge?.config?.chains
  if (chainId === undefined || chainId === null || !chains) return false
  return chains.some((x) => x.id === chainId)
}
