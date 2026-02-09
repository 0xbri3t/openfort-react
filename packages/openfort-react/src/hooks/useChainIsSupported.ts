import { useEVMBridge } from '../core/OpenfortEVMBridgeContext'

export function useChainIsSupported(chainId?: number): boolean {
  const bridge = useEVMBridge()
  const chains = bridge?.config?.chains
  if (chainId === undefined || chainId === null || !chains) return false
  return chains.some((x) => x.id === chainId)
}
