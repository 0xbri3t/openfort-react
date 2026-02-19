/**
 * Centralized EVM account resolution for the playground.
 *
 * - useDisplayEthereumAddress: address only, no wagmi. Safe in evm-only and evm-wagmi (e.g. header).
 * - useConnectedEthereumAccount: address + chainId, uses wagmi. Use only when WagmiProvider is in the tree (evm-wagmi cards).
 *
 * Priority: bridge (wagmi external) → wagmi useAccount → embedded (hook or core.activeEmbeddedAddress).
 */

import { useEthereumBridge, useEthereumEmbeddedWallet, useOpenfort } from '@openfort/react'
import { useAccount, useChainId } from 'wagmi'

const DEFAULT_CHAIN_ID = 13337

function getEmbeddedAddress(
  embedded: ReturnType<typeof useEthereumEmbeddedWallet>,
  core: ReturnType<typeof useOpenfort>
): `0x${string}` | undefined {
  return embedded.status === 'connected' ? embedded.address : (core.activeEmbeddedAddress as `0x${string}` | undefined)
}

/** Address only. Safe in evm-only (no wagmi). Use for header / display. */
export function useDisplayEthereumAddress(): `0x${string}` | undefined {
  const bridge = useEthereumBridge()
  const embedded = useEthereumEmbeddedWallet()
  const core = useOpenfort()
  return bridge?.account.address ?? getEmbeddedAddress(embedded, core)
}

/** Address + chainId. Uses wagmi – only use when WagmiProvider is mounted (evm-wagmi cards). */
export function useConnectedEthereumAccount(): {
  address: `0x${string}` | undefined
  chainId: number
} {
  const bridge = useEthereumBridge()
  const { address: wagmiAddress } = useAccount()
  const embedded = useEthereumEmbeddedWallet()
  const core = useOpenfort()

  const address = bridge?.account.address ?? wagmiAddress ?? getEmbeddedAddress(embedded, core)

  const wagmiChainId = useChainId()
  const chainId =
    wagmiChainId ??
    bridge?.chainId ??
    (embedded.status === 'connected' ? embedded.chainId : undefined) ??
    core.activeChainId ??
    DEFAULT_CHAIN_ID

  return {
    address: address ?? undefined,
    chainId,
  }
}
