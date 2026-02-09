import { type OpenfortEVMBridgeConnector, OpenfortEVMBridgeContext, type OpenfortEVMBridgeValue } from '@openfort/react'
import {
  getEnsAddress as getEnsAddressAction,
  getEnsAvatar as getEnsAvatarAction,
  getEnsName as getEnsNameAction,
} from '@wagmi/core'
import type React from 'react'
import { createElement, type PropsWithChildren, useCallback, useMemo } from 'react'
import { normalize } from 'viem/ens'
import {
  useAccount,
  useChainId,
  useConfig,
  useConnect,
  useDisconnect,
  useEnsAvatar,
  useEnsName,
  useSignMessage,
  useSwitchChain,
  useWalletClient,
} from 'wagmi'

function mapConnector(c: { id: string; name: string; icon?: string; type?: string }): OpenfortEVMBridgeConnector {
  return { id: c.id, name: c.name, icon: c.icon, type: c.type }
}

export const OpenfortWagmiBridge: React.FC<PropsWithChildren> = ({ children }) => {
  const { address, chain, isConnected, connector } = useAccount()
  const chainId = useChainId()
  const config = useConfig()
  const { disconnectAsync } = useDisconnect()
  const { connect, connectAsync: wagmiConnectAsync, connectors, reset } = useConnect()
  const {
    chains,
    switchChain,
    switchChainAsync,
    isPending: isSwitchChainPending,
    error: switchChainError,
  } = useSwitchChain()
  const { data: ensName } = useEnsName({ address: address ?? undefined, chainId: 1 })
  const { data: ensAvatar } = useEnsAvatar({ name: ensName ? normalize(ensName) : undefined, chainId: 1 })
  const { signMessageAsync } = useSignMessage()
  const { data: walletClient } = useWalletClient()

  const connectBridge = useCallback(
    (params: { connector: OpenfortEVMBridgeConnector }) => {
      const c = connectors.find((x) => x.id === params.connector.id && x.name === params.connector.name)
      if (c) connect({ connector: c })
    },
    [connectors, connect]
  )

  const connectAsyncBridge = useCallback(
    async (params: { connector: OpenfortEVMBridgeConnector }) => {
      const c = connectors.find((x) => x.id === params.connector.id && x.name === params.connector.name)
      if (!c) throw new Error('Connector not found')
      return wagmiConnectAsync({ connector: c })
    },
    [connectors, wagmiConnectAsync]
  )

  const getEnsAddress = useCallback(
    async (name: string): Promise<`0x${string}` | undefined> => {
      try {
        return await getEnsAddressAction(config, { name: normalize(name), chainId: 1 })
      } catch {
        return undefined
      }
    },
    [config]
  )

  const getEnsName = useCallback(
    async (params: { address: `0x${string}` }): Promise<string | undefined> => {
      try {
        return await getEnsNameAction(config, { address: params.address, chainId: 1 })
      } catch {
        return undefined
      }
    },
    [config]
  )

  const getEnsAvatar = useCallback(
    async (name: string): Promise<string | undefined> => {
      try {
        return await getEnsAvatarAction(config, { name: normalize(name), chainId: 1 })
      } catch {
        return undefined
      }
    },
    [config]
  )

  const getConnectorAccounts = useCallback(
    async (connectorBridge: OpenfortEVMBridgeConnector): Promise<`0x${string}`[]> => {
      const c = connectors.find((x) => x.id === connectorBridge.id && x.name === connectorBridge.name)
      if (!c?.getAccounts) return []
      const accounts = await c.getAccounts()
      return accounts as `0x${string}`[]
    },
    [connectors]
  )

  const signMessage = useCallback(
    async (params: { message: string }): Promise<`0x${string}`> => {
      if (!signMessageAsync) throw new Error('signMessage not available')
      return signMessageAsync({ message: params.message })
    },
    [signMessageAsync]
  )

  const getWalletClient = useCallback(async () => walletClient ?? undefined, [walletClient])

  const value: OpenfortEVMBridgeValue = useMemo(
    () => ({
      account: {
        address,
        chain: chain ? { id: chain.id, name: chain.name } : undefined,
        isConnected: isConnected ?? false,
        connector: connector ? mapConnector(connector) : undefined,
        ensName: ensName ?? undefined,
        ensAvatar: ensAvatar ?? undefined,
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
        storage: config.storage
          ? {
              getItem: (key: string) => Promise.resolve(config.storage?.getItem(key) ?? null),
              setItem: (key: string, value: string) => config.storage?.setItem(key, value),
            }
          : undefined,
      },
      disconnect: disconnectAsync,
      connect: connectBridge,
      connectAsync: connectAsyncBridge,
      reset,
      connectors: connectors.map((c) => mapConnector(c)),
      switchChain: {
        chains: chains.map((ch) => ({ id: ch.id, name: ch.name })),
        switchChain: switchChain ?? undefined,
        switchChainAsync,
        isPending: isSwitchChainPending,
        error: switchChainError ?? null,
      },
      getEnsAddress,
      getEnsName,
      getEnsAvatar,
      getConnectorAccounts,
      signMessage,
      getWalletClient,
    }),
    [
      address,
      chain,
      isConnected,
      connector,
      chainId,
      config,
      disconnectAsync,
      connectBridge,
      connectAsyncBridge,
      reset,
      connectors,
      chains,
      switchChain,
      isSwitchChainPending,
      switchChainError,
      ensName,
      ensAvatar,
      getEnsAddress,
      getEnsName,
      getEnsAvatar,
      getConnectorAccounts,
      signMessage,
      getWalletClient,
    ]
  )

  return createElement(OpenfortEVMBridgeContext.Provider, { value }, children)
}
