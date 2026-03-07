'use client'

import { ChainTypeEnum, EmbeddedState, type Openfort, RecoveryMethod, type User } from '@openfort/openfort-js'
import type React from 'react'
import {
  createElement,
  Fragment,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useStore } from 'zustand'
import { routes } from '../components/Openfort/types'
import { useOpenfort } from '../components/Openfort/useOpenfort'
import { embeddedWalletId } from '../constants/openfort'
import type { ConnectionStrategy } from '../core/ConnectionStrategy'
import { ConnectionStrategyProvider, useConnectionStrategy } from '../core/ConnectionStrategyContext'
import { firstEmbeddedAddress } from '../core/strategyUtils'
import { OpenfortEthereumBridgeContext } from '../ethereum/OpenfortEthereumBridgeContext'
import { useConnectLifecycle } from '../hooks/useConnectLifecycle'

import { buildRecoveryParams } from '../shared/utils/recovery'
import { logger } from '../utils/logger'
import { handleOAuthConfigError } from '../utils/oauthErrorHandler'
import { mapBridgeConnectorsToWalletProps } from '../wallets/useExternalConnectors'
import type { ConnectCallbackProps } from './connectCallbackTypes'
import { StoreContext } from './context'
import { createOpenfortClient, setDefaultClient } from './core'
import type { OpenfortStore } from './store'
import { createOpenfortStore } from './store'

/**
 * Public return type for useOpenfortCore(). Matches the store shape.
 * Kept as a named type for backward compatibility with consumers that import it.
 */
export type OpenfortCoreContextValue = OpenfortStore

function ConnectLifecycleEffect({ onConnect, onDisconnect }: ConnectCallbackProps) {
  const strategy = useConnectionStrategy()
  useConnectLifecycle(strategy, onConnect, onDisconnect)
  return null
}

type CoreOpenfortProviderProps = PropsWithChildren<
  {
    openfortConfig: ConstructorParameters<typeof Openfort>[0]
  } & ConnectCallbackProps
>

export const CoreOpenfortProvider: React.FC<CoreOpenfortProviderProps> = ({
  children,
  onConnect,
  onDisconnect,
  openfortConfig,
}) => {
  const bridge = useContext(OpenfortEthereumBridgeContext)
  const { walletConfig, chainType, setChainType, uiConfig, open, route, connector } = useOpenfort()

  const bridgeConnectors = useMemo(() => {
    if (!bridge) return []
    return mapBridgeConnectorsToWalletProps(bridge, {
      walletConnectName: uiConfig.walletConnectName,
    })
  }, [bridge, uiConfig.walletConnectName])

  const [solanaStrategy, setSolanaStrategy] = useState<ConnectionStrategy | null>(null)
  useEffect(() => {
    if (!walletConfig?.solana) {
      setSolanaStrategy(null)
      return
    }
    let cancelled = false
    import('../core/strategies/SolanaEmbeddedStrategy').then((m) => {
      if (!cancelled) setSolanaStrategy(m.createSolanaEmbeddedStrategy(walletConfig))
    })
    return () => {
      cancelled = true
    }
  }, [walletConfig])

  const [evmStrategy, setEvmStrategy] = useState<ConnectionStrategy | null>(null)
  useEffect(() => {
    if (!walletConfig?.ethereum && !bridge) {
      setEvmStrategy(null)
      return
    }
    let cancelled = false
    if (bridge) {
      import('../core/strategies/EthereumBridgeStrategy').then((m) => {
        if (!cancelled) setEvmStrategy(m.createEthereumBridgeStrategy(bridge, bridgeConnectors))
      })
    } else {
      import('../core/strategies/EthereumEmbeddedStrategy').then((m) => {
        if (!cancelled) setEvmStrategy(m.createEthereumEmbeddedStrategy(walletConfig))
      })
    }
    return () => {
      cancelled = true
    }
  }, [bridge, bridgeConnectors, walletConfig])

  // ---- Zustand store + Openfort client ----
  const bridgeRef = useRef(bridge)
  bridgeRef.current = bridge

  // ---- Openfort instance ----
  const openfort = useMemo(() => {
    logger.log('Creating Openfort instance.', openfortConfig)

    if (!openfortConfig.baseConfiguration.publishableKey)
      throw Error('CoreOpenfortProvider requires a publishableKey to be set in the baseConfiguration.')

    let resolvedShieldConfig = openfortConfig.shieldConfiguration
    if (resolvedShieldConfig && !resolvedShieldConfig.passkeyRpId && typeof window !== 'undefined') {
      resolvedShieldConfig = {
        passkeyRpId: window.location.hostname,
        passkeyRpName: document.title || 'Openfort app',
        ...resolvedShieldConfig,
      }
    }

    const newClient = createOpenfortClient({ ...openfortConfig, shieldConfiguration: resolvedShieldConfig })

    setDefaultClient(newClient)
    return newClient
  }, [])

  const store = useMemo(() => {
    const s = createOpenfortStore(chainType, () => ({
      hasBridge: !!bridgeRef.current,
      address: bridgeRef.current?.account.address,
    }))
    // Inject client at creation time — avoids setState during render
    s.setState({ client: openfort })
    return s
  }, [])

  // Sync chainType from UI context into the store
  useEffect(() => {
    store.getState().setChainType(chainType)
  }, [store, chainType])

  // Recompute isLoading when bridge address changes (bridge connects/disconnects)
  const address = bridge?.account.address
  useEffect(() => {
    store.getState().recomputeIsLoading()
  }, [store, address])

  const strategy = useMemo(() => {
    const strategyByChain: Partial<Record<ChainTypeEnum, ConnectionStrategy | null>> = {
      [ChainTypeEnum.SVM]: solanaStrategy,
      [ChainTypeEnum.EVM]: evmStrategy,
    }
    return strategyByChain[chainType] ?? null
  }, [chainType, solanaStrategy, evmStrategy])

  // ---- Embedded state ----
  useEffect(() => {
    if (!openfort) return
    const unwatch = openfort.embeddedWallet.watchEmbeddedState({
      onChange: (state, prevState) => {
        logger.log(
          'Embedded state changed:',
          EmbeddedState[state],
          '(prev:',
          prevState !== undefined ? EmbeddedState[prevState] : 'none',
          ')'
        )
        store.getState().setEmbeddedState(state)
      },
      onError: (error) => {
        logger.error('Error watching embedded state:', error)
      },
    })
    return unwatch
  }, [openfort, store])

  const updateUser = useCallback(
    async (user?: User, logoutOnError: boolean = false) => {
      if (!openfort) return null
      logger.log('Updating user', { user, logoutOnError })

      if (user) {
        store.getState().setUser(user)
        return user
      }

      try {
        const user = await openfort.user.get()
        logger.log('Getting user')
        store.getState().setLinkedAccounts(user.linkedAccounts)
        store.getState().setUser(user)
        return user
      } catch (err: unknown) {
        logger.log('Error getting user', err)
        if (!logoutOnError) return null

        const status =
          err && typeof err === 'object' && 'response' in err
            ? (err as { response?: { status?: number } }).response?.status
            : undefined
        if (status === 404) {
          logger.log('User not found, logging out')
          logout()
        } else if (status === 401) {
          logger.log('User not authenticated, logging out')
          logout()
        }
        return null
      }
    },
    [openfort, store]
  )

  const [silentRefetchInProgress, setSilentRefetchInProgress] = useState(false)

  const [isAccountsPending, setAccountsPending] = useState(false)
  const fetchSeqRef = useRef(0)

  const fetchEmbeddedAccounts = useCallback(
    async (options?: { silent?: boolean }) => {
      const seq = ++fetchSeqRef.current
      if (options?.silent) setSilentRefetchInProgress(true)
      setAccountsPending(true)
      try {
        const accounts = await openfort.embeddedWallet.list({
          limit: 100,
        })
        if (seq === fetchSeqRef.current) {
          store.getState().setEmbeddedAccounts(accounts)
        }
        return accounts
      } catch (error: unknown) {
        handleOAuthConfigError(error)
        throw error
      } finally {
        if (seq === fetchSeqRef.current) {
          setAccountsPending(false)
          if (options?.silent) setSilentRefetchInProgress(false)
        }
      }
    },
    [openfort, store]
  )

  const isLoadingAccounts = isAccountsPending && !silentRefetchInProgress
  useEffect(() => {
    store.getState().setIsLoadingAccounts(isLoadingAccounts)
  }, [store, isLoadingAccounts])

  const updateUserRef = useRef(updateUser)
  const fetchEmbeddedAccountsRef = useRef(fetchEmbeddedAccounts)
  useLayoutEffect(() => {
    updateUserRef.current = updateUser
    fetchEmbeddedAccountsRef.current = fetchEmbeddedAccounts
  }, [updateUser, fetchEmbeddedAccounts])

  // Subscribe to store state for effects
  const storeEmbeddedState = useStore(store, (s) => s.embeddedState)
  const storeEmbeddedAccounts = useStore(store, (s) => s.embeddedAccounts)
  const storeActiveEmbeddedAddress = useStore(store, (s) => s.activeEmbeddedAddress)
  const storeUser = useStore(store, (s) => s.user)

  // Sync active embedded address: clear on logout, resolve from SDK, fallback to first account.
  useEffect(() => {
    // No accounts → clear address
    if (!openfort || !storeEmbeddedAccounts?.length) {
      if (!storeEmbeddedAccounts?.length) {
        store.getState().setActiveEmbeddedAddress(undefined)
      }
      return
    }

    // Terminal non-READY states: clear only on genuine logout (no user).
    // During OAuth the state passes through UNAUTHENTICATED → EMBEDDED_SIGNER_NOT_CONFIGURED → READY
    // while accounts and address are already set. Clearing here would undo that.
    if (storeEmbeddedState === EmbeddedState.UNAUTHENTICATED || storeEmbeddedState === EmbeddedState.NONE) {
      if (!store.getState().user) {
        store.getState().setActiveEmbeddedAddress(undefined)
      }
      return
    }

    // Only resolve address when READY
    if (storeEmbeddedState !== EmbeddedState.READY) {
      return
    }

    // Already have an address — nothing to resolve
    if (storeActiveEmbeddedAddress !== undefined) return

    // Priority 1: ask the SDK for its active wallet
    let cancelled = false
    openfort.embeddedWallet
      .get()
      .then((active) => {
        if (cancelled) return
        const addr = active?.address
        if (addr) {
          store.getState().setActiveEmbeddedAddress(addr)
          return
        }
        // Priority 2: fallback to first account for current chain
        const first = firstEmbeddedAddress(storeEmbeddedAccounts, chainType)

        if (first) store.getState().setActiveEmbeddedAddress(first)
      })
      .catch((_err) => {
        if (cancelled) return

        const first = firstEmbeddedAddress(storeEmbeddedAccounts, chainType)
        if (first) store.getState().setActiveEmbeddedAddress(first)
      })
    return () => {
      cancelled = true
    }
  }, [openfort, storeEmbeddedAccounts, storeEmbeddedState, storeActiveEmbeddedAddress, chainType, store])

  // Current chain for EVM provider reconfiguration
  const evmChainId =
    strategy?.chainType === ChainTypeEnum.EVM ? (bridge ? bridge.chainId : strategy?.getChainId()) : undefined

  // Track what we last initialized to avoid redundant initProvider calls when
  // the strategy object is recreated but nothing meaningful changed.
  const lastInitRef = useRef<{ kind: string; chainType: ChainTypeEnum; evmChainId: number | undefined } | null>(null)
  const initInProgressRef = useRef(false)

  // Init provider; only fetch accounts when READY (prevents list() before auth is stored)
  useEffect(() => {
    if (!openfort || !walletConfig || !strategy) return
    // EVM: only run at READY — auto-recover handles EMBEDDED_SIGNER_NOT_CONFIGURED → READY.
    // Running getEthereumProvider() concurrently with recover() causes a race condition.
    // SVM: initProvider is a no-op, safe to run anytime.
    if (storeEmbeddedState !== EmbeddedState.READY) {
      if (
        strategy.chainType === ChainTypeEnum.EVM ||
        storeEmbeddedState !== EmbeddedState.EMBEDDED_SIGNER_NOT_CONFIGURED
      ) {
        return
      }
    }

    // Skip if we already initialized with the same parameters
    const initKey = { kind: strategy.kind, chainType: strategy.chainType, evmChainId }
    const prev = lastInitRef.current
    if (
      prev &&
      prev.kind === initKey.kind &&
      prev.chainType === initKey.chainType &&
      prev.evmChainId === initKey.evmChainId
    ) {
      return
    }

    // Prevent concurrent initProvider calls
    if (initInProgressRef.current) {
      return
    }

    initInProgressRef.current = true
    let cancelled = false
    strategy
      .initProvider(openfort, walletConfig, evmChainId)
      .then(() => {
        if (cancelled) return
        lastInitRef.current = initKey

        // Only fetch accounts when authenticated — avoids SessionError on callback pages
        if (store.getState().embeddedState === EmbeddedState.READY) {
          return fetchEmbeddedAccounts({ silent: true })
        }
        logger.log(
          '[CoreProvider] initProvider: not fetching accounts, state is',
          EmbeddedState[store.getState().embeddedState]
        )
      })
      .catch((_err) => {})
      .finally(() => {
        initInProgressRef.current = false
      })
    return () => {
      cancelled = true
    }
  }, [openfort, walletConfig, strategy, evmChainId, storeEmbeddedState])

  const [isConnectedWithEmbeddedSigner, setIsConnectedWithEmbeddedSigner] = useState(false)
  const connectingRef = useRef(false)

  const userRef = useRef(storeUser)
  useLayoutEffect(() => {
    userRef.current = storeUser
  }, [storeUser])

  useEffect(() => {
    if (!openfort) return
    let cancelled = false

    switch (storeEmbeddedState) {
      case EmbeddedState.NONE:
      case EmbeddedState.CREATING_ACCOUNT:
        break
      case EmbeddedState.UNAUTHENTICATED:
        store.getState().setUser(null)
        break

      case EmbeddedState.EMBEDDED_SIGNER_NOT_CONFIGURED: {
        connectingRef.current = false
        setIsConnectedWithEmbeddedSigner(false)

        // Validate token and fetch accounts. Auto-recovery is handled by the
        // dedicated useEffect below (keyed on storeActiveEmbeddedAddress).
        const doFetch = async () => {
          updateUserRef.current(undefined, !userRef.current)
          await fetchEmbeddedAccountsRef.current()
        }
        doFetch().catch((err) => {
          if (!cancelled) {
            logger.error('EMBEDDED_SIGNER_NOT_CONFIGURED flow failed', err)
          }
        })
        break
      }
      case EmbeddedState.READY: {
        const pollUserUntilReady = async () => {
          for (let i = 0; i < 5; i++) {
            if (cancelled) return

            try {
              const user = await updateUserRef.current(undefined, true)
              if (user) {
                break
              }
            } catch (_err) {}
            await new Promise((resolve) => setTimeout(resolve, 250))
          }
        }
        pollUserUntilReady()
        break
      }
      default:
        throw new Error(`Unknown embedded state: ${storeEmbeddedState}`)
    }

    return () => {
      cancelled = true
    }
  }, [storeEmbeddedState, openfort, store])

  // Auto-recover: when the SDK reaches EMBEDDED_SIGNER_NOT_CONFIGURED with a known
  // active address, attempt to configure the signer via recover() → READY.
  //
  // Reads embeddedAccounts imperatively from the store (not as a dep) so that
  // fetchEmbeddedAccounts updating the store mid-recovery doesn't re-trigger
  // the effect and cancel the closure before recover() runs.
  //
  // On failure: surfaces recoveryError in the store. Does NOT auto-create a new wallet
  // because silently replacing a wallet can strand the user's funds. The app should
  // react to recoveryError and let the user decide (e.g. call wallet.create() with confirmation).
  const autoRecoverInProgressRef = useRef(false)
  useEffect(() => {
    if (storeEmbeddedState !== EmbeddedState.EMBEDDED_SIGNER_NOT_CONFIGURED) return
    if (!storeActiveEmbeddedAddress) return
    if (!openfort || !walletConfig) return
    if (autoRecoverInProgressRef.current) return

    const accounts = store.getState().embeddedAccounts
    if (!accounts?.length) return

    const normalizedTarget = storeActiveEmbeddedAddress.toLowerCase()
    const account = accounts.find((a) => a.address.toLowerCase() === normalizedTarget)
    if (!account) return
    // PASSWORD recovery requires explicit user input — skip auto-recover.
    if (account.recoveryMethod === RecoveryMethod.PASSWORD) return

    // Reset any stale error from a previous attempt before starting fresh.
    store.getState().setRecoveryError(null)
    autoRecoverInProgressRef.current = true
    let cancelled = false

    logger.log('[auto-recover] starting', {
      address: account.address,
      method: account.recoveryMethod,
    })

    const run = async () => {
      // Stage 1: build recovery params (may trigger a passkey prompt for PASSKEY method).
      logger.log('[auto-recover] building recovery params...')
      let recoveryParams: Awaited<ReturnType<typeof buildRecoveryParams>>
      try {
        recoveryParams = await buildRecoveryParams(
          {
            recoveryMethod: account.recoveryMethod === RecoveryMethod.PASSKEY ? RecoveryMethod.PASSKEY : undefined,
            passkeyId:
              account.recoveryMethod === RecoveryMethod.PASSKEY ? account.recoveryMethodDetails?.passkeyId : undefined,
          },
          {
            walletConfig,
            getAccessToken: () => openfort.getAccessToken(),
            getUserId: async () => (await openfort.user.get())?.id,
          }
        )
      } catch (err) {
        if (cancelled) return
        const error = err instanceof Error ? err : new Error(String(err))
        logger.error('[auto-recover] failed to build recovery params', error)
        store.getState().setRecoveryError(error)
        return
      }

      if (cancelled) return

      // Stage 2: configure the embedded signer.
      logger.log('[auto-recover] configuring signer...')
      try {
        await openfort.embeddedWallet.recover({ account: account.id, recoveryParams })
        if (cancelled) return
        logger.log('[auto-recover] succeeded — signer ready', { address: account.address })
        // recoveryError clears automatically in the store subscriber when embeddedState → READY.
      } catch (err) {
        if (cancelled) return
        const error = err instanceof Error ? err : new Error(String(err))
        logger.error(
          '[auto-recover] recover() failed — signer could not be configured. ' +
            'This typically happens on a new device or after local storage was cleared. ' +
            'Read `recoveryError` from useOpenfortCore() and prompt the user to create a new wallet.',
          error
        )
        store.getState().setRecoveryError(error)
      }
    }

    run().finally(() => {
      autoRecoverInProgressRef.current = false
    })

    return () => {
      cancelled = true
    }
  }, [storeEmbeddedState, storeActiveEmbeddedAddress, openfort, walletConfig, store])

  // Refs for UI state that the bridge-connect guard reads but should NOT trigger re-runs.
  const openRef = useRef(open)
  const routeRef = useRef(route)
  const connectorRef = useRef(connector)
  useLayoutEffect(() => {
    openRef.current = open
  }, [open])
  useLayoutEffect(() => {
    routeRef.current = route
  }, [route])
  useLayoutEffect(() => {
    connectorRef.current = connector
  }, [connector])

  useEffect(() => {
    if (!bridge || address || !storeUser) return
    if (chainType !== ChainTypeEnum.EVM) return
    if (isConnectedWithEmbeddedSigner) return
    if (connectingRef.current) return
    if (storeEmbeddedState !== EmbeddedState.READY) return
    if (bridge.account.connector && bridge.account.connector.id !== embeddedWalletId) return

    const currentRoute = routeRef.current
    const routeRoute =
      typeof currentRoute === 'object' && currentRoute && 'route' in currentRoute ? currentRoute.route : currentRoute
    if (
      openRef.current &&
      routeRoute === routes.CONNECT &&
      connectorRef.current?.id &&
      connectorRef.current.id !== embeddedWalletId
    )
      return

    const openfortConnector = bridge.connectors.find((c) => c.name === 'Openfort')
    if (!openfortConnector) return

    connectingRef.current = true
    setIsConnectedWithEmbeddedSigner(true)
    bridge.connect({ connector: openfortConnector })
  }, [bridge, address, storeUser, chainType, storeEmbeddedState, isConnectedWithEmbeddedSigner])

  // ---- Auth functions ----

  const logout = useCallback(async () => {
    if (!openfort) return

    store.getState().setUser(null)
    store.getState().setActiveEmbeddedAddress(undefined)
    store.getState().setEmbeddedAccounts(undefined)
    store.getState().setWalletStatus({ status: 'idle' })
    connectingRef.current = false
    setIsConnectedWithEmbeddedSigner(false)
    lastInitRef.current = null
    logger.log('Logging out...')
    await openfort.auth.logout()
    if (bridge) {
      await bridge.disconnect()
      bridge.reset()
    }
  }, [openfort, bridge, store])

  const signUpGuest = useCallback(async () => {
    if (!openfort) return

    try {
      logger.log('Signing up as guest...')
      const res = await openfort.auth.signUpGuest()
      logger.log('Signed up as guest:', res)
    } catch (error) {
      logger.error('Error logging in as guest:', error)
    }
  }, [openfort])

  // ---- Inject actions into store ----
  useLayoutEffect(() => {
    store.setState({
      logout,
      signUpGuest,
      updateUser,
      updateEmbeddedAccounts: fetchEmbeddedAccounts,
      setChainType,
    })
  }, [store, logout, signUpGuest, updateUser, fetchEmbeddedAccounts, setChainType])

  return createElement(
    StoreContext.Provider,
    { value: store },
    createElement(
      ConnectionStrategyProvider,
      { strategy },
      createElement(Fragment, null, createElement(ConnectLifecycleEffect, { onConnect, onDisconnect }), children)
    )
  )
}
