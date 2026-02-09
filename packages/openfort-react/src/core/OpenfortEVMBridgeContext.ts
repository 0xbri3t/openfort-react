import { createContext, useContext } from 'react'

export interface OpenfortEVMBridgeChain {
  id: number
  name?: string
}

export interface OpenfortEVMBridgeConnector {
  id: string
  name: string
  icon?: string
  type?: string
}

export interface OpenfortEVMBridgeAccount {
  address: `0x${string}` | undefined
  chain?: OpenfortEVMBridgeChain
  isConnected: boolean
  connector?: OpenfortEVMBridgeConnector
  ensName?: string
  ensAvatar?: string
}

export interface OpenfortEVMBridgeStorage {
  getItem: (key: string) => Promise<string | null>
  setItem: (key: string, value: string) => void
}

export interface OpenfortEVMBridgeConfig {
  chains: { id: number }[]
  getClient: (opts: { chainId: number }) => { transport: { url: string } }
  storage?: OpenfortEVMBridgeStorage
}

export interface OpenfortEVMBridgeSwitchChain {
  chains: OpenfortEVMBridgeChain[]
  switchChain: ((params: { chainId: number }) => void) | undefined
  switchChainAsync?: (params: { chainId: number }) => Promise<unknown>
  isPending: boolean
  error: Error | null
}

export interface OpenfortEVMBridgeValue {
  account: OpenfortEVMBridgeAccount
  chainId: number
  config: OpenfortEVMBridgeConfig
  disconnect: () => Promise<void>
  connect: (params: { connector: OpenfortEVMBridgeConnector }) => void
  connectAsync?: (params: { connector: OpenfortEVMBridgeConnector }) => Promise<unknown>
  reset: () => void
  connectors: OpenfortEVMBridgeConnector[]
  switchChain: OpenfortEVMBridgeSwitchChain
  getEnsAddress?: (name: string) => Promise<`0x${string}` | undefined>
  getEnsName?: (params: { address: `0x${string}` }) => Promise<string | undefined>
  getEnsAvatar?: (name: string) => Promise<string | undefined>
  getConnectorAccounts?: (connector: OpenfortEVMBridgeConnector) => Promise<`0x${string}`[]>
  signMessage?: (params: { message: string }) => Promise<`0x${string}`>
  getWalletClient?: () => Promise<import('viem').WalletClient | undefined>
}

export const OpenfortEVMBridgeContext = createContext<OpenfortEVMBridgeValue | null>(null)

export function useEVMBridge(): OpenfortEVMBridgeValue | null {
  return useContext(OpenfortEVMBridgeContext)
}
