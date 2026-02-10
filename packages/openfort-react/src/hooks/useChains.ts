import { useMemo } from 'react'
import type { Chain } from 'viem'
import { useOpenfort } from '../components/Openfort/useOpenfort'
import { useConnectionStrategy } from '../core/ConnectionStrategyContext'
import { useEVMBridge } from '../core/OpenfortEVMBridgeContext'
import { buildChainFromConfig } from '../utils/rpc'

export function useChains(): Chain[] {
  const bridge = useEVMBridge()
  const strategy = useConnectionStrategy()
  const { walletConfig } = useOpenfort()

  return useMemo(() => {
    if (bridge?.switchChain?.chains?.length) {
      return bridge.switchChain.chains as Chain[]
    }
    if (strategy?.kind === 'embedded') {
      const chainId = strategy.getChainId()
      if (chainId != null) {
        return [buildChainFromConfig(chainId, walletConfig?.ethereum?.rpcUrls)]
      }
    }
    return []
  }, [bridge?.switchChain?.chains, strategy?.kind, strategy, walletConfig?.ethereum?.rpcUrls])
}
