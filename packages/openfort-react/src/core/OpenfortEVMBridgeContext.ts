import { createContext } from 'react'

export interface OpenfortEVMBridgeChain {
  id: number
  name?: string
}

export interface OpenfortEVMBridgeConnector {
  id: string
  name: string
}

export interface OpenfortEVMBridgeAccount {
  address: `0x${string}` | undefined
  chain?: OpenfortEVMBridgeChain
  isConnected: boolean
  connector?: OpenfortEVMBridgeConnector
}

export interface OpenfortEVMBridgeConfig {
  chains: { id: number }[]
  getClient: (opts: { chainId: number }) => { transport: { url: string } }
}

export interface OpenfortEVMBridgeValue {
  account: OpenfortEVMBridgeAccount
  chainId: number
  config: OpenfortEVMBridgeConfig
  disconnect: () => Promise<void>
  connect: (params: { connector: OpenfortEVMBridgeConnector }) => void
  reset: () => void
  connectors: OpenfortEVMBridgeConnector[]
}

export const OpenfortEVMBridgeContext = createContext<OpenfortEVMBridgeValue | null>(null)
