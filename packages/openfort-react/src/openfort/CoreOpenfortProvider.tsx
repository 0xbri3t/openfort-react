import {
  AccountTypeEnum,
  ChainTypeEnum,
  type EmbeddedAccount,
  EmbeddedState,
  type Openfort,
  type User,
} from '@openfort/openfort-js'
import { type QueryObserverResult, type RefetchOptions, useQuery, useQueryClient } from '@tanstack/react-query'
import type React from 'react'
import {
  createElement,
  Fragment,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useOpenfort } from '../components/Openfort/useOpenfort'
import { type ConnectionStrategy, DEFAULT_DEV_CHAIN_ID } from '../core/ConnectionStrategy'
import { ConnectionStrategyProvider, useConnectionStrategy } from '../core/ConnectionStrategyContext'
import { OpenfortEVMBridgeContext } from '../core/OpenfortEVMBridgeContext'
import { queryKeys } from '../core/queryKeys'
import { createEVMBridgeStrategy } from '../core/strategies/EVMBridgeStrategy'
import { createEVMEmbeddedStrategy } from '../core/strategies/EVMEmbeddedStrategy'
import { createSolanaEmbeddedStrategy } from '../core/strategies/SolanaEmbeddedStrategy'
import type { WalletReadiness } from '../core/types'
import type { WalletFlowStatus } from '../hooks/openfort/useWallets'
import { useConnectLifecycle } from '../hooks/useConnectLifecycle'
import type { UserAccount } from '../openfortCustomTypes'
import { OpenfortError, OpenfortReactErrorType } from '../types'
import { logger } from '../utils/logger'
import { handleOAuthConfigError } from '../utils/oauthErrorHandler'
import { mapBridgeConnectorsToWalletProps } from '../wallets/useEVMConnectors'
import type { ConnectCallbackProps } from './connectCallbackTypes'
import { Context } from './context'
import { createOpenfortClient, setDefaultClient } from './core'

export type OpenfortCoreContextValue = {
  signUpGuest: () => Promise<void>
  embeddedState: EmbeddedState
  isAuthenticated: boolean

  isLoading: boolean
  needsRecovery: boolean
  user: User | null
  updateUser: (user?: User) => Promise<User | null>
  linkedAccounts: UserAccount[]

  embeddedAccounts?: EmbeddedAccount[]
  isLoadingAccounts: boolean
  walletReadiness: WalletReadiness

  /** Current active embedded wallet address (drives top-right / useConnectedWallet). Set by useEthereumEmbeddedWallet.setActive and synced from SDK on load. */
  activeEmbeddedAddress: string | undefined
  setActiveEmbeddedAddress: (address: string | undefined) => void

  /** Current chain for EVM embedded (no bridge). Persisted in localStorage. When set, useConnectedWallet and writes use this chain. */
  activeChainId: number | undefined
  setActiveChainId: (chainId: number | undefined) => void

  logout: () => void

  updateEmbeddedAccounts: (
    options?: RefetchOptions & { silent?: boolean }
  ) => Promise<QueryObserverResult<EmbeddedAccount[], Error>>

  walletStatus: WalletFlowStatus
  setWalletStatus: (status: WalletFlowStatus) => void

  pollingError: OpenfortError | null
  retryPolling: () => void

  providerError: unknown
  client: Openfort
}

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
  const bridge = useContext(OpenfortEVMBridgeContext)
  const { walletConfig, chainType, uiConfig } = useOpenfort()

  const bridgeConnectors = useMemo(() => {
    if (!bridge) return []
    return mapBridgeConnectorsToWalletProps(bridge, {
      walletConnectName: uiConfig.walletConnectName,
    })
  }, [bridge, uiConfig.walletConnectName])

  const strategy = useMemo(() => {
    const strategyByChain: Partial<Record<ChainTypeEnum, ConnectionStrategy | null>> = {
      [ChainTypeEnum.SVM]: createSolanaEmbeddedStrategy(walletConfig),
      [ChainTypeEnum.EVM]: bridge
        ? createEVMBridgeStrategy(bridge, bridgeConnectors)
        : createEVMEmbeddedStrategy(walletConfig),
    }
    return strategyByChain[chainType] ?? null
  }, [bridge, chainType, walletConfig, bridgeConnectors])

  const address = bridge?.account.address
  const [user, setUser] = useState<User | null>(null)
  const [providerError, setProviderError] = useState<unknown>(null)
  const [linkedAccounts, setLinkedAccounts] = useState<UserAccount[]>([])
  const [walletStatus, setWalletStatus] = useState<WalletFlowStatus>({ status: 'idle' })

  // ---- Openfort instance ----
  const openfort = useMemo(() => {
    logger.log('Creating Openfort instance.', openfortConfig)

    if (!openfortConfig.baseConfiguration.publishableKey)
      throw Error('CoreOpenfortProvider requires a publishableKey to be set in the baseConfiguration.')

    if (
      openfortConfig.shieldConfiguration &&
      !openfortConfig.shieldConfiguration?.passkeyRpId &&
      typeof window !== 'undefined'
    ) {
      const loc = window.location
      if (loc) {
        openfortConfig.shieldConfiguration = {
          passkeyRpId: loc.hostname,
          passkeyRpName: typeof document !== 'undefined' ? document.title || 'Openfort DApp' : 'Openfort DApp',
          ...openfortConfig.shieldConfiguration,
        }
      }
    }

    const newClient = createOpenfortClient(openfortConfig)

    setDefaultClient(newClient)
    return newClient
  }, [])

  // ---- Embedded state ----
  const [embeddedState, setEmbeddedState] = useState<EmbeddedState>(EmbeddedState.NONE)
  const [pollingError, setPollingError] = useState<OpenfortError | null>(null)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const previousEmbeddedState = useRef<EmbeddedState>(EmbeddedState.NONE)
  const retryCountRef = useRef(0)
  const POLLING_RETRIES = 3
  const POLLING_BASE_MS = 2000

  const pollEmbeddedState = useCallback(async () => {
    if (!openfort) return

    try {
      const state = await openfort.embeddedWallet.getEmbeddedState()
      setEmbeddedState(state)
      setPollingError(null)
      retryCountRef.current = 0
    } catch (error) {
      logger.error('Error checking embedded state with Openfort:', error)
      if (retryCountRef.current < POLLING_RETRIES) {
        retryCountRef.current += 1
        const delay = POLLING_BASE_MS * 2 ** retryCountRef.current
        setTimeout(pollEmbeddedState, delay)
      } else {
        setPollingError(
          error instanceof OpenfortError
            ? error
            : new OpenfortError('Embedded state polling failed', OpenfortReactErrorType.UNEXPECTED_ERROR, {
                error,
              })
        )
        if (pollingRef.current) {
          clearInterval(pollingRef.current)
          pollingRef.current = null
        }
      }
    }
  }, [openfort])

  const retryPolling = useCallback(() => {
    retryCountRef.current = 0
    setPollingError(null)
    pollEmbeddedState()
    if (!pollingRef.current) {
      pollingRef.current = setInterval(pollEmbeddedState, 300)
    }
  }, [pollEmbeddedState])

  // Only log embedded state when it changes
  useEffect(() => {
    if (previousEmbeddedState.current !== embeddedState) {
      logger.log('Embedded state changed:', EmbeddedState[embeddedState])
      previousEmbeddedState.current = embeddedState
    }
  }, [embeddedState])

  const startPollingEmbeddedState = useCallback(() => {
    if (pollingRef.current) return
    pollingRef.current = setInterval(pollEmbeddedState, 300)
  }, [pollEmbeddedState])

  const stopPollingEmbeddedState = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!openfort) return

    startPollingEmbeddedState()

    return () => {
      stopPollingEmbeddedState()
    }
  }, [openfort])

  const updateUser = useCallback(
    async (user?: User, logoutOnError: boolean = false) => {
      if (!openfort) return null
      logger.log('Updating user', { user, logoutOnError })

      if (user) {
        setUser(user)
        return user
      }

      try {
        const user = await openfort.user.get()
        logger.log('Getting user')
        setLinkedAccounts(user.linkedAccounts)
        setUser(user)
        return user
      } catch (err: any) {
        logger.log('Error getting user', err)
        if (!logoutOnError) return null

        if (err?.response?.status === 404) {
          logger.log('User not found, logging out')
          logout()
        } else if (err?.response?.status === 401) {
          logger.log('User not authenticated, logging out')
          logout()
        }
        return null
      }
    },
    [openfort]
  )

  const [silentRefetchInProgress, setSilentRefetchInProgress] = useState(false)

  // SVM (Solana) wallets are EOA; EVM uses walletConfig.accountType so the core sees the right list after guest signup
  const embeddedAccountsAccountType =
    chainType === ChainTypeEnum.SVM
      ? undefined
      : walletConfig?.accountType === AccountTypeEnum.EOA
        ? undefined
        : AccountTypeEnum.SMART_ACCOUNT

  // Embedded accounts list. Will reset on logout.
  const {
    data: embeddedAccounts,
    refetch: refetchEmbeddedAccounts,
    isPending: isAccountsPending,
  } = useQuery({
    queryKey: queryKeys.accounts.embedded(embeddedAccountsAccountType),
    queryFn: async () => {
      try {
        return await openfort.embeddedWallet.list({
          limit: 100,
          accountType: embeddedAccountsAccountType,
        })
      } catch (error: unknown) {
        handleOAuthConfigError(error)
        throw error
      }
    },
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    retry: false,
  })

  const fetchEmbeddedAccounts = useCallback(
    async (options?: RefetchOptions & { silent?: boolean }) => {
      if (options?.silent) setSilentRefetchInProgress(true)
      try {
        return await refetchEmbeddedAccounts(options)
      } finally {
        if (options?.silent) setSilentRefetchInProgress(false)
      }
    },
    [refetchEmbeddedAccounts]
  )

  const isLoadingAccounts = isAccountsPending && !silentRefetchInProgress

  const [activeEmbeddedAddress, setActiveEmbeddedAddress] = useState<string | undefined>(undefined)

  const ACTIVE_CHAIN_ID_KEY = 'openfort_active_chain_id'
  const [activeChainId, setActiveChainIdState] = useState<number | undefined>(() => {
    if (typeof window === 'undefined') return undefined
    const s = window.localStorage.getItem(ACTIVE_CHAIN_ID_KEY)
    if (s == null) return undefined
    const n = parseInt(s, 10)
    if (Number.isNaN(n)) return undefined
    // Never restore default dev chain from storage so first render uses strategy default (avoids policy/chain mismatch)
    if (n === DEFAULT_DEV_CHAIN_ID) {
      window.localStorage.removeItem(ACTIVE_CHAIN_ID_KEY)
      return undefined
    }
    return n
  })
  const setActiveChainId = useCallback((chainId: number | undefined) => {
    setActiveChainIdState(chainId)
    if (typeof window !== 'undefined') {
      if (chainId == null) window.localStorage.removeItem(ACTIVE_CHAIN_ID_KEY)
      else window.localStorage.setItem(ACTIVE_CHAIN_ID_KEY, String(chainId))
    }
  }, [])

  // If stored activeChainId is not in configured EVM chains (e.g. old Sepolia 11155111), reset to strategy default
  useEffect(() => {
    if (!strategy || strategy.kind !== 'embedded' || !walletConfig?.ethereum) return
    const ethereum = walletConfig.ethereum
    const configuredChainIds = new Set<number>([
      ...(ethereum.chainId != null ? [ethereum.chainId] : []),
      ...(ethereum.rpcUrls ? Object.keys(ethereum.rpcUrls).map(Number) : []),
    ])
    if (activeChainId != null && configuredChainIds.size > 0 && !configuredChainIds.has(activeChainId)) {
      const defaultChainId = strategy.getChainId()
      if (defaultChainId != null) setActiveChainId(defaultChainId)
    }
  }, [strategy, walletConfig?.ethereum, activeChainId, setActiveChainId])

  // Sync active embedded address from SDK on load (only when wallet is actually recovered)
  useEffect(() => {
    if (!openfort || !embeddedAccounts?.length) {
      if (!embeddedAccounts?.length) setActiveEmbeddedAddress(undefined)
      return
    }
    if (embeddedState !== EmbeddedState.READY) {
      setActiveEmbeddedAddress(undefined)
      return
    }
    let cancelled = false
    openfort.embeddedWallet
      .get()
      .then((active) => {
        if (cancelled || !active) return
        const addr = active.address
        if (addr) setActiveEmbeddedAddress(addr)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [openfort, embeddedAccounts?.length, embeddedState])

  useEffect(() => {
    if (!openfort || !walletConfig || !strategy) return

    strategy
      .initProvider(openfort, walletConfig)
      .then(() => fetchEmbeddedAccounts())
      .catch((err) => {
        logger.error('Strategy initProvider failed', err)
        setProviderError(err)
      })
  }, [openfort, walletConfig, strategy])

  const [isConnectedWithEmbeddedSigner, setIsConnectedWithEmbeddedSigner] = useState(false)

  useEffect(() => {
    if (!openfort) return
    // Poll embedded signer state

    switch (embeddedState) {
      case EmbeddedState.NONE:
      case EmbeddedState.CREATING_ACCOUNT:
        break
      case EmbeddedState.UNAUTHENTICATED:
        setUser(null)
        break

      case EmbeddedState.EMBEDDED_SIGNER_NOT_CONFIGURED:
        if (!user) updateUser(undefined, true)

        setIsConnectedWithEmbeddedSigner(false)
        fetchEmbeddedAccounts()

        break
      case EmbeddedState.READY:
        ;(async () => {
          for (let i = 0; i < 5; i++) {
            logger.log('Trying to update user...', i)
            try {
              const user = await updateUser(undefined, true)
              if (user) break
            } catch (err) {
              logger.error('Error updating user, retrying...', err)
            }
            await new Promise((resolve) => setTimeout(resolve, 250))
          }
        })()
        break
      default:
        throw new Error(`Unknown embedded state: ${embeddedState}`)
    }
  }, [embeddedState, openfort])

  useEffect(() => {
    if (!bridge || address || !user) return
    if (isConnectedWithEmbeddedSigner) return
    if (embeddedState !== EmbeddedState.READY) return

    const openfortConnector = bridge.connectors.find((c) => c.name === 'Openfort')
    if (!openfortConnector) return

    logger.log('Connecting to wagmi with Openfort')
    setIsConnectedWithEmbeddedSigner(true)
    bridge.connect({ connector: openfortConnector })
  }, [bridge, address, user, embeddedState, isConnectedWithEmbeddedSigner])

  // ---- Auth functions ----

  const queryClient = useQueryClient()
  const logout = useCallback(async () => {
    if (!openfort) return

    setUser(null)
    setActiveEmbeddedAddress(undefined)
    setWalletStatus({ status: 'idle' })
    logger.log('Logging out...')
    await openfort.auth.logout()
    if (bridge) {
      await bridge.disconnect()
      bridge.reset()
    }
    queryClient.resetQueries({ queryKey: queryKeys.accounts.all() })
    startPollingEmbeddedState()
  }, [openfort, bridge, queryClient])

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

  // ---- Return values ----

  const isLoading = useMemo(() => {
    switch (embeddedState) {
      case EmbeddedState.NONE:
      case EmbeddedState.CREATING_ACCOUNT:
        return true

      case EmbeddedState.UNAUTHENTICATED:
        if (user) return true
        return false

      case EmbeddedState.EMBEDDED_SIGNER_NOT_CONFIGURED:
        if (!user) return true
        return false

      case EmbeddedState.READY:
        if (!user) return true
        if (bridge && !address) return true
        return false

      default:
        return true
    }
  }, [embeddedState, address, user, bridge])

  const needsRecovery =
    embeddedState === EmbeddedState.EMBEDDED_SIGNER_NOT_CONFIGURED && (embeddedAccounts?.length ?? 0) > 0

  const walletReadiness = useMemo((): WalletReadiness => {
    if (isLoadingAccounts) return 'loading'
    if (!embeddedAccounts || embeddedAccounts.length === 0) return 'not-created'
    if (embeddedState === EmbeddedState.EMBEDDED_SIGNER_NOT_CONFIGURED) return 'needs-recovery'
    return 'ready'
  }, [isLoadingAccounts, embeddedAccounts, embeddedState])

  const isAuthenticated = embeddedState !== EmbeddedState.NONE && embeddedState !== EmbeddedState.UNAUTHENTICATED

  const value: OpenfortCoreContextValue = {
    signUpGuest,
    embeddedState,
    isAuthenticated,
    logout,

    isLoading,
    needsRecovery,
    user,
    linkedAccounts,
    updateUser,
    updateEmbeddedAccounts: fetchEmbeddedAccounts,

    embeddedAccounts,
    isLoadingAccounts,
    walletReadiness,

    activeEmbeddedAddress,
    setActiveEmbeddedAddress,

    activeChainId,
    setActiveChainId,

    walletStatus,
    setWalletStatus,

    pollingError,
    retryPolling,
    providerError,

    client: openfort,
  }

  return createElement(
    Context.Provider,
    { value },
    createElement(
      ConnectionStrategyProvider,
      { strategy },
      createElement(Fragment, null, createElement(ConnectLifecycleEffect, { onConnect, onDisconnect }), children)
    )
  )
}
