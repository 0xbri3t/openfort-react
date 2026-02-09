import { useEffect, useState } from 'react'
import { useEVMBridge } from '../core/OpenfortEVMBridgeContext'
import type { ConnectCallbackProps } from '../openfort/connectCallbackTypes'
import { useOpenfortCore } from '../openfort/useOpenfort'
import useIsMounted from './useIsMounted'

export type { ConnectCallbackProps as useConnectCallbackProps } from '../openfort/connectCallbackTypes'

export const useConnectCallback = ({ onConnect, onDisconnect }: ConnectCallbackProps) => {
  const { user } = useOpenfortCore()
  const bridge = useEVMBridge()
  const address = bridge?.account?.address
  const connector = bridge?.account?.connector
  const hasAddress = !!address
  const [isConnected, setIsConnected] = useState(false)
  const isMounted = useIsMounted()

  useEffect(() => {
    if (hasAddress && user) {
      setIsConnected(true)
    } else {
      setIsConnected(false)
    }
  }, [user, hasAddress])

  useEffect(() => {
    if (!isMounted) return

    if (isConnected) {
      onConnect?.({
        address: address,
        connectorId: connector?.id,
        user: user || undefined,
      })
    } else {
      onDisconnect?.()
    }
  }, [isConnected, address, connector, user, isMounted, onConnect, onDisconnect])
}
