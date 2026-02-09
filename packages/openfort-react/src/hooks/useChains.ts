import type { Chain } from 'viem'
import { useEVMBridge } from '../core/OpenfortEVMBridgeContext'

export function useChains(): Chain[] {
  const bridge = useEVMBridge()
  const chains = bridge?.switchChain?.chains ?? []
  return chains as Chain[]
}
