'use client'

import { useEffect, useRef } from 'react'
import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { embeddedWalletId } from '../constants/openfort'
import { useEthereumEmbeddedWallet } from '../ethereum/hooks/useEthereumEmbeddedWallet'
import { setEmbeddedWalletProvider } from './embeddedConnector'

/** Null component — call inside CoreOpenfortProvider + WagmiProvider to sync embedded wallet into wagmi. */
export function EmbeddedWalletWagmiSync(): null {
  useEmbeddedWalletWagmiSync()
  return null
}

function useEmbeddedWalletWagmiSync() {
  const wallet = useEthereumEmbeddedWallet()
  const { connector: activeConnector } = useAccount()
  const { connectAsync, connectors } = useConnect()
  const { disconnectAsync } = useDisconnect()
  const isSyncingRef = useRef(false)

  const status = wallet.status
  const provider = status === 'connected' ? wallet.provider : null

  useEffect(() => {
    if (status === 'connected' && provider) {
      if (isSyncingRef.current) return
      isSyncingRef.current = true
      setEmbeddedWalletProvider(provider)
      const embeddedConnector = connectors.find((c) => c.id === embeddedWalletId)
      if (embeddedConnector && activeConnector?.id !== embeddedWalletId) {
        connectAsync({ connector: embeddedConnector })
          .catch(() => {
            // provider may not be ready yet — sync will retry on next status change
          })
          .finally(() => {
            isSyncingRef.current = false
          })
      } else {
        isSyncingRef.current = false
      }
    }

    if (status === 'disconnected') {
      setEmbeddedWalletProvider(null)
      if (activeConnector?.id === embeddedWalletId) {
        // Pass the specific connector so only the embedded one is disconnected,
        // leaving any external wallet connections untouched.
        const embeddedConnector = connectors.find((c) => c.id === embeddedWalletId)
        if (embeddedConnector) {
          disconnectAsync({ connector: embeddedConnector })
        }
      }
    }
  }, [status, provider, connectors, activeConnector, connectAsync, disconnectAsync])
}
