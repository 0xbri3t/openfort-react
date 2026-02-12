import { useMemo } from 'react'
import type { Chain } from 'viem'
import { useOpenfort } from '../components/Openfort/useOpenfort'
import { DEFAULT_DEV_CHAIN_ID } from '../core/ConnectionStrategy'
import { useConnectionStrategy } from '../core/ConnectionStrategyContext'
import { useEthereumBridge } from '../ethereum/OpenfortEthereumBridgeContext'
import { buildChainFromConfig } from '../utils/rpc'

export function useChains(): Chain[] {
  const bridge = useEthereumBridge()
  const strategy = useConnectionStrategy()
  const { walletConfig } = useOpenfort()

  return useMemo(() => {
    if (bridge?.switchChain?.chains?.length) {
      return bridge.switchChain.chains as Chain[]
    }
    if (strategy?.kind === 'embedded') {
      const rpcUrls = walletConfig?.ethereum?.rpcUrls
      const defaultChainId = walletConfig?.ethereum?.chainId ?? DEFAULT_DEV_CHAIN_ID
      const chainIds =
        rpcUrls && Object.keys(rpcUrls).length > 0
          ? [...new Set([...Object.keys(rpcUrls).map(Number), defaultChainId])]
          : [defaultChainId]
      return chainIds.map((id) => buildChainFromConfig(id, rpcUrls))
    }
    return []
  }, [bridge?.switchChain?.chains, strategy?.kind, walletConfig?.ethereum?.rpcUrls, walletConfig?.ethereum?.chainId])
}
