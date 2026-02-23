/**
 * Centralized EVM account resolution for the playground.
 *
 * - useDisplayEthereumAddress: address only. Safe in evm-only and evm-wagmi (e.g. header).
 *   Uses EthereumAddressContext (provided by EthereumAddressProviderWagmi/Embedded).
 * - useConnectedEthereumAccount: address + chainId. Use only when WagmiProvider is mounted (evm-wagmi cards).
 *   Uses wagmi hooks directly.
 */

import { useEthereumEmbeddedWallet, useOpenfort } from '@openfort/react'
import { useAccount, useChainId } from 'wagmi'
import { useEthereumAddressContext } from '@/contexts/EthereumAddressContext'

const DEFAULT_CHAIN_ID = 13337

function getEmbeddedAddress(
  embedded: ReturnType<typeof useEthereumEmbeddedWallet>,
  core: ReturnType<typeof useOpenfort>
): `0x${string}` | undefined {
  return embedded.status === 'connected' ? embedded.address : (core.activeEmbeddedAddress as `0x${string}` | undefined)
}

/** Address only. Safe in evm-only and evm-wagmi. Use for header / display. */
export function useDisplayEthereumAddress(): `0x${string}` | undefined {
  return useEthereumAddressContext()
}

/** Address + chainId. Uses wagmi – only use when WagmiProvider is mounted (evm-wagmi cards). */
export function useConnectedEthereumAccount(): {
  address: `0x${string}` | undefined
  chainId: number
} {
  const { address: wagmiAddress } = useAccount()
  const embedded = useEthereumEmbeddedWallet()
  const core = useOpenfort()

  const address = wagmiAddress ?? getEmbeddedAddress(embedded, core)

  const wagmiChainId = useChainId()
  const chainId =
    wagmiChainId ??
    (embedded.status === 'connected' ? embedded.chainId : undefined) ??
    core.activeChainId ??
    DEFAULT_CHAIN_ID

  return {
    address: address ?? undefined,
    chainId,
  }
}
