/**
 * Shared logic for resolving the active embedded wallet and connecting state.
 * Use in SetActiveWalletsCard and ConnectExternalWalletCard to avoid duplicating
 * activeWallet / connectingAddress derivation.
 *
 * Priority: hook activeWallet (when status is connected/connecting/reconnecting/needs-recovery)
 * → connectedAddress match → core.activeEmbeddedAddress match.
 */

import { useEthereumEmbeddedWallet, useOpenfort } from '@openfort/react'

type EmbeddedWallet = ReturnType<typeof useEthereumEmbeddedWallet>['wallets'][number]

export function useActiveEmbeddedWallet(): {
  activeWallet: EmbeddedWallet | null
  connectingAddress: string | undefined
} {
  const core = useOpenfort()
  const embedded = useEthereumEmbeddedWallet()
  const wallets = embedded.wallets

  const connectedAddress = embedded.status === 'connected' ? embedded.address : undefined
  const activeWalletFromHook =
    embedded.status === 'connected' ||
    embedded.status === 'connecting' ||
    embedded.status === 'reconnecting' ||
    embedded.status === 'needs-recovery'
      ? (embedded.activeWallet ?? null)
      : null

  const activeWallet =
    activeWalletFromHook != null
      ? activeWalletFromHook
      : connectedAddress != null
        ? (wallets.find((w) => w.address.toLowerCase() === connectedAddress.toLowerCase()) ?? null)
        : core.activeEmbeddedAddress != null
          ? (wallets.find((w) => w.address.toLowerCase() === core.activeEmbeddedAddress!.toLowerCase()) ?? null)
          : null

  const connectingAddress =
    embedded.status === 'connecting' || embedded.status === 'reconnecting'
      ? (embedded.activeWallet?.address ?? activeWalletFromHook?.address)
      : undefined

  return { activeWallet, connectingAddress }
}
