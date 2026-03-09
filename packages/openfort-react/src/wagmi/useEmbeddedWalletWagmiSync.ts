'use client'

import { useEffect } from 'react'
import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { embeddedWalletId } from '../constants/openfort'
import { useEthereumEmbeddedWallet } from '../ethereum/hooks/useEthereumEmbeddedWallet'
import { setEmbeddedWalletProvider } from './embeddedConnector'

/** Null component — rendered inside CoreOpenfortProvider + WagmiProvider to sync embedded wallet into wagmi. */
export function EmbeddedWalletWagmiSync(): null {
  useEmbeddedWalletWagmiSync()
  return null
}

function useEmbeddedWalletWagmiSync() {
  const wallet = useEthereumEmbeddedWallet()
  const { connector: activeConnector, status: wagmiStatus } = useAccount()
  const { connectAsync, connectors } = useConnect()
  const { disconnectAsync } = useDisconnect()

  const status = wallet.status
  const provider = status === 'connected' ? wallet.provider : null

  // Keep the module-level provider slot in sync — clear on disconnect
  useEffect(() => {
    if (status === 'connected' && provider) {
      setEmbeddedWalletProvider(provider)
      return () => {
        setEmbeddedWalletProvider(null)
      }
    }
  }, [status, provider])

  // Connect wagmi once the embedded wallet is ready AND wagmi has settled (not mid-reconnect)
  useEffect(() => {
    if (status !== 'connected' || !provider) return
    if (wagmiStatus === 'connecting' || wagmiStatus === 'reconnecting') return
    if (activeConnector?.id === embeddedWalletId) return

    const embeddedConnector = connectors.find((c) => c.id === embeddedWalletId)
    if (!embeddedConnector) return

    connectAsync({ connector: embeddedConnector }).catch(() => {})
  }, [status, provider, wagmiStatus, activeConnector, connectors, connectAsync])

  // Disconnect embedded connector from wagmi when the embedded wallet logs out
  useEffect(() => {
    if (status !== 'disconnected') return
    if (activeConnector?.id !== embeddedWalletId) return

    const embeddedConnector = connectors.find((c) => c.id === embeddedWalletId)
    if (embeddedConnector) {
      disconnectAsync({ connector: embeddedConnector }).catch(() => {})
    }
  }, [status, activeConnector, connectors, disconnectAsync])
}
