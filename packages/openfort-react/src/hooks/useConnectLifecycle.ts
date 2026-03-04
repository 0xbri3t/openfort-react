'use client'

import { useContext, useEffect, useRef } from 'react'
import { OpenfortContext } from '../components/Openfort/context'
import type { ConnectionStrategy } from '../core/ConnectionStrategy'
import type { ConnectCallbackProps } from '../openfort/connectCallbackTypes'
import { useOpenfortStore } from '../openfort/useOpenfortStore'

/**
 * Standalone hook: subscribes to connection lifecycle and fires onConnect/onDisconnect
 * when strategy.isConnected(state) changes. Must be used inside OpenfortProvider and
 * CoreOpenfortProvider (so both OpenfortContext and OpenfortCoreContext are available).
 */
export function useConnectLifecycle(
  strategy: ConnectionStrategy | null,
  onConnect: ConnectCallbackProps['onConnect'],
  onDisconnect: ConnectCallbackProps['onDisconnect']
): void {
  const user = useOpenfortStore((s) => s.user)
  const embeddedAccounts = useOpenfortStore((s) => s.embeddedAccounts)
  const activeEmbeddedAddress = useOpenfortStore((s) => s.activeEmbeddedAddress)
  const embeddedState = useOpenfortStore((s) => s.embeddedState)
  const ui = useContext(OpenfortContext)
  const prevConnected = useRef(false)

  useEffect(() => {
    if (!strategy || !ui) return

    const state = {
      user,
      embeddedAccounts,
      chainType: ui.chainType,
      activeEmbeddedAddress,
      embeddedState,
    }
    const connected = strategy.isConnected(state)

    if (connected && !prevConnected.current) {
      prevConnected.current = true
      const address = strategy.getAddress(state)
      onConnect?.({
        address: address ?? undefined,
        connectorId: undefined,
        user: state.user ?? undefined,
      })
    } else if (!connected && prevConnected.current) {
      prevConnected.current = false
      onDisconnect?.()
    } else {
      prevConnected.current = connected
    }
  }, [strategy, user, embeddedAccounts, activeEmbeddedAddress, embeddedState, ui, onConnect, onDisconnect])
}
