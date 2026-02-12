import { useMemo } from 'react'
import type { Chain } from 'viem'
import { useConnectionStrategy } from '../core/ConnectionStrategyContext'
import { useEthereumBridge } from '../ethereum/OpenfortEthereumBridgeContext'
import { useChains } from './useChains'

export type UseSwitchChainReturnType = {
  chains: readonly Chain[]
  switchChain: ((params: { chainId: number }) => void) | undefined
  switchChainAsync: ((params: { chainId: number }) => Promise<unknown>) | undefined
  isPending: boolean
  isError: boolean
  error: Error | null
}

/**
 * Wagmi-compatible switch chain hook. In bridge mode delegates to the bridge;
 * in embedded mode switchChain/switchChainAsync are undefined (single chain).
 *
 * @deprecated When using wagmi, use wagmi's `useSwitchChain` instead. When using EVM-only (no wagmi),
 * use `useEthereumSwitchChain` from the adapter API.
 *
 * @example
 * ```tsx
 * const { chains, switchChain, isPending } = useSwitchChain()
 * if (switchChain) {
 *   return chains.map((c) => (
 *     <button key={c.id} onClick={() => switchChain({ chainId: c.id })} disabled={isPending}>
 *       {c.name}
 *     </button>
 *   ))
 * }
 * return <p>Single chain (embedded)</p>
 * ```
 */
export function useSwitchChain(): UseSwitchChainReturnType {
  const strategy = useConnectionStrategy()
  const bridge = useEthereumBridge()
  const chains = useChains()

  return useMemo(() => {
    const isBridge = strategy?.kind === 'bridge'
    const switchChainApi = isBridge ? bridge?.switchChain : undefined
    return {
      chains,
      switchChain: switchChainApi?.switchChain ?? undefined,
      switchChainAsync: switchChainApi?.switchChainAsync ?? undefined,
      isPending: switchChainApi?.isPending ?? false,
      isError: !!switchChainApi?.error,
      error: switchChainApi?.error ?? null,
    }
  }, [strategy?.kind, bridge?.switchChain, chains])
}
