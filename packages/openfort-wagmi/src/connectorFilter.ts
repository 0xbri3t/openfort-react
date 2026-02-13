import { embeddedWalletId } from '@openfort/react'

type ConnectorLike = { id: string; name?: string }

/**
 * Excludes connectors from the external wallet list (Openfort only; dedup MetaMask/Coinbase).
 * Internal to @openfort/wagmi — not part of the public API.
 */
export function shouldExcludeConnector(connector: ConnectorLike, allConnectors: ConnectorLike[]): boolean {
  const { id, name } = connector
  const has = (ids: string[]) => allConnectors.some((w) => ids.includes(w.id))

  if (id === embeddedWalletId || name?.toLowerCase().includes('openfort')) return true
  if (has(['io.metamask', 'io.metamask.mobile']) && (id === 'metaMask' || id === 'metaMaskSDK')) return true
  if (has(['com.coinbase.wallet']) && id === 'coinbaseWalletSDK') return true

  return false
}
