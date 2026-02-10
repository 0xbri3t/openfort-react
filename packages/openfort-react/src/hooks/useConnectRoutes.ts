import type { ConnectRoute } from '../core/ConnectionStrategy'
import { useConnectionStrategy } from '../core/ConnectionStrategyContext'

/**
 * Returns the connect routes for the current strategy.
 * When only 'embedded', ConnectModal skips the Connectors page and goes to providers → create/recover.
 * When 'external-wallets' is present, Connectors page is shown (bridge/Wagmi path).
 */
export function useConnectRoutes(): ConnectRoute[] {
  const strategy = useConnectionStrategy()
  if (!strategy) return ['embedded']
  return strategy.getConnectRoutes()
}
