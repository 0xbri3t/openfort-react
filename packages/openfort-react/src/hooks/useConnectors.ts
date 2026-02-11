import type { OpenfortEVMBridgeConnector } from '../core/OpenfortEVMBridgeContext'
import { useEVMBridge } from '../core/OpenfortEVMBridgeContext'

function useConnectors(): OpenfortEVMBridgeConnector[] {
  const bridge = useEVMBridge()
  return bridge?.connectors ?? []
}

export function useConnector(id: string, uuid?: string): OpenfortEVMBridgeConnector | undefined {
  const connectors = useConnectors()
  if (id === 'injected' && uuid) {
    return connectors.find((c) => c.id === id && c.name === uuid)
  }
  if (id === 'injected') {
    return connectors.find((c) => c.id === id && c.name?.includes('Injected'))
  }
  return connectors.find((c) => c.id === id)
}

export function useFamilyAccountsConnector() {
  return useConnector('familyAccountsProvider')
}
export function useFamilyConnector() {
  return useConnector('co.family.wallet')
}
