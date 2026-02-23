/**
 * Provides the display Ethereum address for the playground.
 * - evm-wagmi: address from wagmi (external) or embedded
 * - evm-only: address from embedded only (no wagmi)
 */

import { useEthereumEmbeddedWallet, useOpenfort } from '@openfort/react'
import type React from 'react'
import { createContext, useContext } from 'react'
import { useAccount } from 'wagmi'

const EthereumAddressContext = createContext<`0x${string}` | undefined>(undefined)

function getEmbeddedAddress(
  embedded: ReturnType<typeof useEthereumEmbeddedWallet>,
  core: ReturnType<typeof useOpenfort>
): `0x${string}` | undefined {
  return embedded.status === 'connected' ? embedded.address : (core.activeEmbeddedAddress as `0x${string}` | undefined)
}

/** Use inside WagmiProvider (evm-wagmi mode). */
export function EthereumAddressProviderWagmi({ children }: { children: React.ReactNode }) {
  const { address: wagmiAddress } = useAccount()
  const embedded = useEthereumEmbeddedWallet()
  const core = useOpenfort()
  const address = wagmiAddress ?? getEmbeddedAddress(embedded, core)
  const value = address ?? undefined
  return <EthereumAddressContext.Provider value={value}>{children}</EthereumAddressContext.Provider>
}

/** Use when WagmiProvider is not mounted (evm-only mode). */
export function EthereumAddressProviderEmbedded({ children }: { children: React.ReactNode }) {
  const embedded = useEthereumEmbeddedWallet()
  const core = useOpenfort()
  const address = getEmbeddedAddress(embedded, core)
  const value = address ?? undefined
  return <EthereumAddressContext.Provider value={value}>{children}</EthereumAddressContext.Provider>
}

export function useEthereumAddressContext(): `0x${string}` | undefined {
  return useContext(EthereumAddressContext)
}
