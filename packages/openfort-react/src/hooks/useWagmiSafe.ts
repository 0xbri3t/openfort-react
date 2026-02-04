/**
 * Safe Wagmi hook wrappers that return default values when not in WagmiProvider.
 *
 * These hooks allow OpenfortProvider to work in Solana-only mode without
 * requiring a WagmiProvider wrapper.
 *
 * Uses @wagmi/core functions with the config from context.
 */

import { getAccount, getConnectors, watchAccount, watchConnectors } from '@wagmi/core'
import { useContext, useSyncExternalStore } from 'react'
import { type Connector, WagmiContext } from 'wagmi'

// Default account state for when Wagmi is not available
const defaultAccountState = {
  address: undefined as `0x${string}` | undefined,
  addresses: undefined as readonly `0x${string}`[] | undefined,
  chain: undefined as import('viem').Chain | undefined,
  chainId: undefined as number | undefined,
  connector: undefined as Connector | undefined,
  isConnected: false,
  isConnecting: false,
  isDisconnected: true,
  isReconnecting: false,
  status: 'disconnected' as const,
}

/**
 * Check if currently inside a WagmiProvider
 */
export function useHasWagmi(): boolean {
  return !!useContext(WagmiContext)
}

/**
 * Safe version of useAccount that returns default values when not in WagmiProvider.
 *
 * Uses @wagmi/core getAccount and watchAccount with the config from context.
 */
export function useAccountSafe() {
  const config = useContext(WagmiContext)

  // Subscribe to account changes when Wagmi is available
  const state = useSyncExternalStore(
    (onStoreChange) => {
      if (!config) return () => {}
      return watchAccount(config, { onChange: onStoreChange })
    },
    () => {
      if (!config) return defaultAccountState
      return getAccount(config)
    },
    () => defaultAccountState // Server-side rendering fallback
  )

  return state
}

/**
 * Safe version that returns chains configuration when in WagmiProvider
 */
export function useChainsSafe() {
  const config = useContext(WagmiContext)

  if (!config) {
    return []
  }

  return config.chains
}

/**
 * Safe version of useChainIsSupported that returns false when not in WagmiProvider
 */
export function useChainIsSupportedSafe(chainId?: number): boolean {
  const chains = useChainsSafe()

  if (chains.length === 0 || chainId === undefined || chainId === null) {
    return false
  }

  return chains.some((x) => x.id === chainId)
}

/**
 * Safe version that returns connectors when in WagmiProvider
 */
export function useConnectorsSafe(): Connector[] {
  const config = useContext(WagmiContext)

  const connectors = useSyncExternalStore(
    (onStoreChange) => {
      if (!config) return () => {}
      return watchConnectors(config, { onChange: onStoreChange })
    },
    () => {
      if (!config) return []
      return getConnectors(config) as Connector[]
    },
    () => [] // Server-side rendering fallback
  )

  return connectors
}

/**
 * Safe version of useConnector that returns undefined when not in WagmiProvider
 */
export function useConnectorSafe(id: string, uuid?: string): Connector | undefined {
  const connectors = useConnectorsSafe()

  if (connectors.length === 0) {
    return undefined
  }

  if (id === 'injected' && uuid) {
    return connectors.find((c) => c.id === id && c.name === uuid)
  } else if (id === 'injected') {
    return connectors.find((c) => c.id === id && c.name.includes('Injected'))
  }
  return connectors.find((c) => c.id === id)
}
