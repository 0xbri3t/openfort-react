/**
 * Connect/link external wallets via SIWE. Wagmi-only; use from @openfort/wagmi.
 */

import type { OpenfortError } from '@openfort/openfort-js'
import type { OpenfortEthereumBridgeConnector } from '@openfort/react'
import {
  createSIWEMessage,
  embeddedWalletId,
  OpenfortError as OpenfortErrorClass,
  useEthereumBridge,
  useOpenfort,
} from '@openfort/react'
import { useCallback, useMemo } from 'react'

/** Wallet option for UI (id, name, icon, connector). */
export interface AvailableWallet {
  id: string
  name: string
  icon?: string
  connector: OpenfortEthereumBridgeConnector
}

export interface WalletAuthCallbacks {
  onConnect?: () => void
  onError?: (error: string, openfortError?: OpenfortError) => void
}

function runConnectWithSiwe(
  bridge: NonNullable<ReturnType<typeof useEthereumBridge>>,
  openfort: ReturnType<typeof useOpenfort>,
  params: {
    address?: `0x${string}`
    connectorType?: string
    walletClientType?: string
    link: boolean
    onConnect?: () => void
    onError?: (error: string, openfortError?: OpenfortError) => void
  }
): Promise<void> {
  const { client, updateUser } = openfort
  const address = params.address ?? bridge.account?.address
  const connectorType = params.connectorType ?? bridge.account?.connector?.type
  const walletClientType = params.walletClientType ?? bridge.account?.connector?.id
  const chainId = bridge.chainId ?? 0
  const accountChainId = bridge.account?.chain?.id ?? bridge.chainId
  const chainName = bridge.account?.chain?.name
  const switchChainAsync = bridge.switchChain?.switchChainAsync
  const signMessage = bridge.signMessage

  if (!address || !connectorType || !walletClientType) {
    params.onError?.('No address found')
    return Promise.resolve()
  }
  if (!signMessage) {
    params.onError?.('EVM bridge not available (signMessage)')
    return Promise.resolve()
  }

  return (async () => {
    try {
      if (accountChainId !== chainId && switchChainAsync) {
        await switchChainAsync({ chainId })
      }
      const nonce = params.link
        ? (await client.auth.initLinkSiwe({ address })).nonce
        : (await client.auth.initSiwe({ address })).nonce
      const siweMsg = createSIWEMessage(address, nonce, chainId)
      if (!siweMsg) throw new Error('SIWE message creation failed (window not available)')
      const messageStr =
        typeof siweMsg === 'string'
          ? siweMsg
          : typeof (siweMsg as { prepareMessage?: () => Promise<string> }).prepareMessage === 'function'
            ? await (siweMsg as { prepareMessage: () => Promise<string> }).prepareMessage()
            : String(siweMsg)
      const signature = await signMessage({ message: messageStr })
      if (params.link) {
        await client.auth.linkWithSiwe({
          signature,
          message: messageStr,
          connectorType,
          walletClientType,
          address,
          chainId,
        })
      } else {
        await client.auth.loginWithSiwe({
          signature,
          message: messageStr,
          connectorType,
          walletClientType,
          address,
        })
      }
      await updateUser()
      params.onConnect?.()
    } catch (err) {
      if (!params.onError) return
      let message = err instanceof Error ? err.message : String(err)
      if (message.includes('User rejected the request.')) message = 'User rejected the request.'
      else if (message.includes('Invalid signature')) message = 'Invalid signature. Please try again.'
      else if (message.includes('An error occurred when attempting to switch chain')) {
        message = `Failed to switch chain. Please switch your wallet to ${chainName ?? 'the correct network'} and try again.`
      } else if (message.includes('already linked')) {
        message = 'This wallet is already linked to another account. Log out and connect with this wallet instead.'
      } else {
        message = 'Failed to connect with SIWE.'
      }
      params.onError(message, err instanceof OpenfortErrorClass ? err : undefined)
    }
  })()
}

export function useWalletAuth() {
  const bridge = useEthereumBridge()
  const openfort = useOpenfort()

  const availableWallets = useMemo((): AvailableWallet[] => {
    if (!bridge?.connectors?.length) return []
    return bridge.connectors
      .filter((c) => c.id !== embeddedWalletId)
      .map((c) => ({ id: c.id, name: c.name ?? c.id, icon: c.icon, connector: c }))
  }, [bridge?.connectors])

  const runConnectThenSiwe = useCallback(
    async (connectorId: string, link: boolean, callbacks?: WalletAuthCallbacks) => {
      const connector = bridge?.connectors?.find((c) => c.id === connectorId)
      if (!connector || !bridge?.connectAsync) {
        callbacks?.onError?.('Connector not available')
        return
      }
      if (bridge.account.isConnected) {
        await bridge.disconnect()
      }
      try {
        const result = await bridge.connectAsync({ connector })
        const connectResult =
          result && typeof result === 'object' && 'accounts' in result
            ? (result as { accounts: readonly `0x${string}`[]; chainId: number })
            : undefined
        const addressFromResult = connectResult?.accounts?.[0]
        await runConnectWithSiwe(bridge, openfort, {
          address: addressFromResult,
          connectorType: connector.type,
          walletClientType: connector.id,
          link,
          onConnect: callbacks?.onConnect,
          onError: callbacks?.onError,
        })
      } catch (err) {
        callbacks?.onError?.(err instanceof Error ? err.message : 'Connection failed')
      }
    },
    [bridge, openfort]
  )

  const connectWallet = useCallback(
    (connectorId: string, callbacks?: WalletAuthCallbacks) => runConnectThenSiwe(connectorId, false, callbacks),
    [runConnectThenSiwe]
  )

  const linkWallet = useCallback(
    (connectorId: string, callbacks?: WalletAuthCallbacks) => runConnectThenSiwe(connectorId, true, callbacks),
    [runConnectThenSiwe]
  )

  return { availableWallets, connectWallet, linkWallet }
}
