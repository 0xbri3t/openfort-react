import { type OpenfortEVMBridgeConnector, OpenfortEVMBridgeContext, type OpenfortEVMBridgeValue } from '@openfort/react'
import type React from 'react'
import { createElement, type PropsWithChildren, useCallback, useMemo } from 'react'
import { useAccount, useChainId, useConfig, useConnect, useDisconnect } from 'wagmi'

function mapConnector(c: { id: string; name: string }): OpenfortEVMBridgeConnector {
  return { id: c.id, name: c.name }
}

export const OpenfortWagmiBridge: React.FC<PropsWithChildren> = ({ children }) => {
  const { address, chain, isConnected, connector } = useAccount()
  const chainId = useChainId()
  const config = useConfig()
  const { disconnectAsync } = useDisconnect()
  const { connect, connectors, reset } = useConnect()

  const connectBridge = useCallback(
    (params: { connector: OpenfortEVMBridgeConnector }) => {
      const c = connectors.find((x) => x.id === params.connector.id && x.name === params.connector.name)
      if (c) connect({ connector: c })
    },
    [connectors, connect]
  )

  const value: OpenfortEVMBridgeValue = useMemo(
    () => ({
      account: {
        address,
        chain: chain ? { id: chain.id, name: chain.name } : undefined,
        isConnected: isConnected ?? false,
        connector: connector ? mapConnector(connector) : undefined,
      },
      chainId,
      config: {
        chains: config.chains.map((ch) => ({ id: ch.id })),
        getClient: (opts) => {
          const client = config.getClient({ chainId: opts.chainId })
          return {
            transport: {
              url: (client as { transport?: { url?: string } })?.transport?.url ?? '',
            },
          }
        },
      },
      disconnect: disconnectAsync,
      connect: connectBridge,
      reset,
      connectors: connectors.map(mapConnector),
    }),
    [address, chain, isConnected, connector, chainId, config, disconnectAsync, connectBridge, reset, connectors]
  )

  return createElement(OpenfortEVMBridgeContext.Provider, { value }, children)
}
