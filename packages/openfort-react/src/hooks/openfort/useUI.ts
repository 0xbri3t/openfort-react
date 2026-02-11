import { ChainTypeEnum } from '@openfort/openfort-js'
import { type RouteOptions, type RoutesWithoutOptions, routes } from '../../components/Openfort/types'
import { useOpenfort } from '../../components/Openfort/useOpenfort'
import { useConnectionStrategy } from '../../core/ConnectionStrategyContext'
import { useOpenfortCore } from '../../openfort/useOpenfort'
import { logger } from '../../utils/logger'

type ModalRoutes = RoutesWithoutOptions['route'] | RouteOptions

const connectedRouteByChain: Record<ChainTypeEnum, ModalRoutes> = {
  [ChainTypeEnum.EVM]: routes.ETH_CONNECTED,
  [ChainTypeEnum.SVM]: routes.SOL_CONNECTED,
}

const safeRoutes: {
  connected: ModalRoutes[]
  disconnected: ModalRoutes[]
} = {
  disconnected: [
    routes.PROVIDERS,
    { route: routes.CONNECTORS, connectType: 'linkIfUserConnectIfNoUser' },
    routes.MOBILECONNECTORS,
  ],
  connected: [
    routes.CONNECTED,
    routes.ETH_CONNECTED,
    routes.SOL_CONNECTED,
    { route: routes.CONNECTORS, connectType: 'linkIfUserConnectIfNoUser' },
    routes.SWITCHNETWORKS,
    routes.PROVIDERS,
  ],
}

const allRoutes: ModalRoutes[] = [...safeRoutes.connected, ...safeRoutes.disconnected]

type ValidRoutes = ModalRoutes

export function useUI() {
  const { open, setOpen, setRoute, chainType } = useOpenfort()
  const { isLoading, user, needsRecovery, embeddedAccounts, activeEmbeddedAddress, embeddedState } = useOpenfortCore()
  const strategy = useConnectionStrategy()
  const state = { user, embeddedAccounts, chainType, activeEmbeddedAddress, embeddedState }
  const isConnected = strategy?.isConnected(state) ?? false

  function defaultOpen() {
    setOpen(true)

    if (isLoading) setRoute(routes.LOADING)
    else if (!user) setRoute(routes.PROVIDERS)
    else if (!isConnected) setRoute(routes.LOAD_WALLETS)
    else if (needsRecovery) setRoute(routes.LOAD_WALLETS)
    else setRoute(connectedRouteByChain[chainType])
  }

  const gotoAndOpen = (route: ValidRoutes) => {
    let validRoute: ValidRoutes = route

    if (!allRoutes.includes(route)) {
      validRoute = isConnected ? routes.CONNECTED : routes.PROVIDERS
      logger.log(`Route ${route} is not a valid route, navigating to ${validRoute} instead.`)
    } else {
      if (isConnected) {
        if (!safeRoutes.connected.includes(route)) {
          validRoute = routes.CONNECTED
          logger.log(`Route ${route} is not a valid route when connected, navigating to ${validRoute} instead.`)
        }
      } else {
        if (!safeRoutes.disconnected.includes(route)) {
          validRoute = routes.PROVIDERS
          logger.log(`Route ${route} is not a valid route when disconnected, navigating to ${validRoute} instead.`)
        }
      }
    }

    setRoute(validRoute)
    setOpen(true)
  }

  return {
    isOpen: open,
    open: () => defaultOpen(),
    close: () => setOpen(false),
    setIsOpen: setOpen,

    openProfile: () => gotoAndOpen(connectedRouteByChain[chainType]),
    openSwitchNetworks: () => gotoAndOpen(routes.SWITCHNETWORKS),
    openProviders: () => gotoAndOpen(routes.PROVIDERS),
    openWallets: () => gotoAndOpen({ route: routes.CONNECTORS, connectType: 'linkIfUserConnectIfNoUser' }),
  }
}
