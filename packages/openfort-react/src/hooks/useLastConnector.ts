import { useEffect, useState } from 'react'
import { useEthereumBridge } from '../ethereum/OpenfortEthereumBridgeContext'

export const useLastConnector = () => {
  const bridge = useEthereumBridge()
  const storage = bridge?.config?.storage
  const [lastConnectorId, setLastConnectorId] = useState<string | null>(null)

  useEffect(() => {
    const init = async () => {
      const id = storage ? await storage.getItem('recentConnectorId') : null
      setLastConnectorId(id ?? '')
    }
    init()
  }, [storage])

  const update = (id: string) => {
    storage?.setItem('recentConnectorId', id)
  }

  return {
    lastConnectorId,
    updateLastConnectorId: update,
  }
}
