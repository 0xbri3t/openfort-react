import { AccountTypeEnum, type EmbeddedAccount, EmbeddedState, type Openfort, type User } from '@openfort/openfort-js'
import { type QueryObserverResult, type RefetchOptions, useQuery, useQueryClient } from '@tanstack/react-query'
import type React from 'react'
import {
  createElement,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useOpenfort } from '../components/Openfort/useOpenfort'
import { OpenfortEVMBridgeContext } from '../core/OpenfortEVMBridgeContext'
import { queryKeys } from '../core/queryKeys'
import type { WalletReadiness } from '../core/types'
import type { WalletFlowStatus } from '../hooks/openfort/useWallets'
import type { UserAccount } from '../openfortCustomTypes'
import { OpenfortError, OpenfortReactErrorType } from '../types'
import { logger } from '../utils/logger'
import { handleOAuthConfigError } from '../utils/oauthErrorHandler'
import type { ConnectCallbackProps } from './connectCallbackTypes'
import { Context } from './context'
import { createOpenfortClient, setDefaultClient } from './core'
import { useOpenfortCore } from './useOpenfort'

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

  logout: () => void

  updateEmbeddedAccounts: (
    options?: RefetchOptions & { silent?: boolean }
  ) => Promise<QueryObserverResult<EmbeddedAccount[], Error>>

  walletStatus: WalletFlowStatus
  setWalletStatus: (status: WalletFlowStatus) => void

  pollingError: OpenfortError | null
  retryPolling: () => void

  client: Openfort
}

const ConnectCallback = ({ onConnect, onDisconnect }: ConnectCallbackProps) => {
  const bridge = useContext(OpenfortEVMBridgeContext)
  const { user } = useOpenfortCore()
  const address = bridge?.account.address
  const connectorId = bridge?.account.connector?.id
  const prevConnected = useRef(false)

  useEffect(() => {
    if (!bridge) return
    const connected = !!(address && user)
    if (connected && !prevConnected.current) {
      prevConnected.current = true
      onConnect?.({
        address: address ?? undefined,
        connectorId,
        user: user ?? undefined,
      })
    } else if (!connected && prevConnected.current) {
      prevConnected.current = false
      onDisconnect?.()
    } else if (connected) {
      prevConnected.current = true
    } else {
      prevConnected.current = false
    }
  }, [bridge, address, user, connectorId, onConnect, onDisconnect])

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
  const address = bridge?.account.address
  const chainId = bridge?.chainId ?? 1
  const [user, setUser] = useState<User | null>(null)
  const [linkedAccounts, setLinkedAccounts] = useState<UserAccount[]>([])
  const [walletStatus, setWalletStatus] = useState<WalletFlowStatus>({ status: 'idle' })

  const { walletConfig } = useOpenfort()

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

  const embeddedAccountsAccountType =
    walletConfig?.accountType === AccountTypeEnum.EOA ? undefined : AccountTypeEnum.SMART_ACCOUNT

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

  // Update ethereum provider when chainId changes (only when EVM bridge is present)
  useEffect(() => {
    if (!openfort || !walletConfig || !bridge) return

    const resolvePolicy = () => {
      const { ethereumProviderPolicyId } = walletConfig

      if (!ethereumProviderPolicyId) return undefined

      if (typeof ethereumProviderPolicyId === 'string') {
        return { policy: ethereumProviderPolicyId }
      }

      const policy = ethereumProviderPolicyId[chainId]
      if (!policy) {
        logger.log(`No policy found for chainId ${chainId}.`)
        return undefined
      }

      return { policy }
    }

    const rpcUrls = bridge.config.chains.reduce(
      (acc, ch) => {
        const rpcUrl = bridge.config.getClient({ chainId: ch.id }).transport.url
        if (rpcUrl) {
          acc[ch.id] = rpcUrl
        }
        return acc
      },
      {} as Record<number, string>
    )

    logger.log('Getting ethereum provider', { chainId, rpcUrls })

    openfort.embeddedWallet.getEthereumProvider({
      ...resolvePolicy(),
      chains: rpcUrls,
    })

    fetchEmbeddedAccounts()
  }, [openfort, walletConfig, chainId, bridge])

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
    setWalletStatus({ status: 'idle' })
    logger.log('Logging out...')
    await openfort.auth.logout()
    if (bridge) {
      await bridge.disconnect()
      queryClient.resetQueries({ queryKey: queryKeys.accounts.all() })
      bridge.reset()
    }
    startPollingEmbeddedState()
  }, [openfort, bridge])

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

  const isLoading = useCallback(() => {
    switch (embeddedState) {
      case EmbeddedState.NONE:
      case EmbeddedState.CREATING_ACCOUNT:
        return true

      case EmbeddedState.UNAUTHENTICATED:
        if (user) return true // If user i<s set in unauthenticated state, it means that the embedded state is not up to date, so we should wait
        return false

      case EmbeddedState.EMBEDDED_SIGNER_NOT_CONFIGURED:
        if (!user) return true

        // If automatic recovery is enabled, we should wait for the embedded signer to be ready
        return false
      case EmbeddedState.READY:
        if (!user) return true
        if (bridge) {
          if (!address) return true
        }
        return false

      default:
        return true
    }
  }, [embeddedState, address, user, bridge])

  const needsRecovery = embeddedState === EmbeddedState.EMBEDDED_SIGNER_NOT_CONFIGURED && !address

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

    isLoading: isLoading(),
    needsRecovery,
    user,
    linkedAccounts,
    updateUser,
    updateEmbeddedAccounts: fetchEmbeddedAccounts,

    embeddedAccounts,
    isLoadingAccounts,
    walletReadiness,

    walletStatus,
    setWalletStatus,

    pollingError,
    retryPolling,

    client: openfort,
  }

  return createElement(
    Context.Provider,
    { value },
    <>
      <ConnectCallback onConnect={onConnect} onDisconnect={onDisconnect} />
      {children}
    </>
  )
}
