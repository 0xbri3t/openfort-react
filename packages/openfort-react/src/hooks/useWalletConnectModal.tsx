import { useState } from 'react'
import { useEthereumBridge } from '../ethereum/OpenfortEthereumBridgeContext'
import { isWalletConnectConnector } from '../utils'
import { logger } from '../utils/logger'

export function useWalletConnectModal() {
  const bridge = useEthereumBridge()
  const [isOpen, setIsOpen] = useState(false)

  return {
    isOpen,
    open: async () => {
      const w3mcss = document.createElement('style')
      w3mcss.innerHTML = `w3m-modal, wcm-modal{ --wcm-z-index: 2147483647; --w3m-z-index:2147483647; }`
      document.head.appendChild(w3mcss)

      const removeChild = () => {
        if (document.head.contains(w3mcss)) {
          document.head.removeChild(w3mcss)
        }
      }

      const connectors = bridge?.connectors ?? []
      const clientConnector = connectors.find((c) => isWalletConnectConnector(c.id))

      if (clientConnector && bridge?.connectAsync) {
        try {
          setIsOpen(true)
          try {
            await bridge.connectAsync({ connector: clientConnector })
          } catch (err) {
            logger.log('WalletConnect', err)
            return {
              error: 'Connection failed',
            }
          }

          setIsOpen(false)

          removeChild()
          return {}
        } catch (err) {
          logger.log('Could not get WalletConnect provider', err)
          removeChild()
          return {
            error: 'Could not get WalletConnect provider',
          }
        }
      } else {
        removeChild()
        logger.log('Configuration error: Please provide a WalletConnect Project ID in your wagmi config.')
        return {
          error: 'Configuration error: Please provide a WalletConnect Project ID in your wagmi config.',
        }
      }
    },
  }
}
