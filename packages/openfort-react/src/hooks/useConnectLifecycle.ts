import { useContext, useEffect, useRef } from 'react'
import { Openfortcontext } from '../components/Openfort/context'
import type { ConnectionStrategy } from '../core/ConnectionStrategy'
import type { ConnectCallbackProps } from '../openfort/connectCallbackTypes'
import { Context as OpenfortCoreContext } from '../openfort/context'

/**
 * Standalone hook: subscribes to connection lifecycle and fires onConnect/onDisconnect
 * when strategy.isConnected(state) changes. Must be used inside OpenfortProvider and
 * CoreOpenfortProvider (so both Openfortcontext and OpenfortCoreContext are available).
 */
export function useConnectLifecycle(
  strategy: ConnectionStrategy | null,
  onConnect: ConnectCallbackProps['onConnect'],
  onDisconnect: ConnectCallbackProps['onDisconnect']
): void {
  const core = useContext(OpenfortCoreContext)
  const ui = useContext(Openfortcontext)
  const prevConnected = useRef(false)

  useEffect(() => {
    if (!strategy || !core || !ui) return

    const state = {
      user: core.user,
      embeddedAccounts: core.embeddedAccounts,
      chainType: ui.chainType,
      activeEmbeddedAddress: core.activeEmbeddedAddress,
      embeddedState: core.embeddedState,
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
  }, [strategy, core, ui, onConnect, onDisconnect])
}
