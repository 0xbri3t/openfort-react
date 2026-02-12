import { useMemo } from 'react'
import type { Chain } from 'viem'
import { useEVMBridge } from '../core/OpenfortEVMBridgeContext'
import { useChain } from '../shared/hooks/useChain'
import { useChains } from './useChains'
import { useConnectedWallet } from './useConnectedWallet'

export type UseAccountReturnType = {
  address: `0x${string}` | undefined
  chainId: number | undefined
  chain: Chain | undefined
  isConnected: boolean
  isConnecting: boolean
  isDisconnected: boolean
  isReconnecting: boolean
  status: 'connected' | 'connecting' | 'disconnected' | 'reconnecting'
  connector: { id: string; name: string } | undefined
}

/**
 * Wagmi-compatible account hook. Returns connected wallet address, chain, and status
 * for both bridge (wagmi) and embedded (viem-only) strategies.
 *
 * @example
 * ```tsx
 * const { address, chainId, isConnected, status } = useAccount()
 * if (isConnected && address) {
 *   console.log('Connected:', address, 'on chain', chainId)
 * }
 * ```
 */
export function useAccount(): UseAccountReturnType {
  const { isEvm } = useChain()
  const wallet = useConnectedWallet()
  const chains = useChains()
  const bridge = useEVMBridge()

  const status: UseAccountReturnType['status'] = useMemo(
    () => (isEvm ? wallet.normalizedStatus : 'disconnected'),
    [isEvm, wallet.normalizedStatus]
  )

  const chainId = isEvm && wallet.status === 'connected' ? wallet.chainId : undefined
  const chain = useMemo(() => (chainId != null ? chains.find((c) => c.id === chainId) : undefined), [chains, chainId])
  const address = isEvm && wallet.status === 'connected' ? (wallet.address as `0x${string}`) : undefined
  const connector = bridge?.account?.connector
    ? { id: bridge.account.connector.id, name: bridge.account.connector.name ?? bridge.account.connector.id }
    : undefined

  return {
    address,
    chainId,
    chain,
    isConnected: isEvm && wallet.isConnected,
    isConnecting: isEvm && wallet.isConnecting,
    isDisconnected: !isEvm || wallet.isDisconnected,
    isReconnecting: isEvm && wallet.isReconnecting,
    status,
    connector,
  }
}
