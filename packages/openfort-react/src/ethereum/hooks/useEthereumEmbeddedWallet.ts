import {
  AccountTypeEnum,
  ChainTypeEnum,
  type EmbeddedAccount,
  EmbeddedState,
  RecoveryMethod,
} from '@openfort/openfort-js'
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useOpenfort } from '../../components/Openfort/useOpenfort'
import { embeddedWalletId } from '../../constants/openfort'
import { useConnectionStrategy } from '../../core/ConnectionStrategyContext'
import { formatErrorWithReason, OpenfortError, OpenfortErrorCode } from '../../core/errors'
import { useOpenfortCore } from '../../openfort/useOpenfort'
import type { SetRecoveryOptions, WalletStatus } from '../../shared/types'
import { buildEmbeddedWalletStatusResult } from '../../shared/utils/embeddedWalletStatusMapper'
import { formatAddress } from '../../utils/format'
import { logger } from '../../utils/logger'
import { OpenfortEthereumBridgeContext } from '../OpenfortEthereumBridgeContext'
import type {
  ConnectedEmbeddedEthereumWallet,
  CreateEthereumWalletOptions,
  EmbeddedEthereumWalletState,
  OpenfortEmbeddedEthereumWalletProvider,
  SetActiveEthereumWalletOptions,
  UseEmbeddedEthereumWalletOptions,
} from '../types'
import { buildRecoveryParams } from './utils'

type InternalState = {
  status: WalletStatus
  activeWallet: ConnectedEmbeddedEthereumWallet | null
  provider: OpenfortEmbeddedEthereumWalletProvider | null
  error: string | null
}

function toConnectedStateProperties(
  status: WalletStatus,
  internalState: {
    address?: string
    walletType?: 'embedded' | 'external'
    connectorId?: string
    connectorName?: string
  },
  activeWallet: ConnectedEmbeddedEthereumWallet | null,
  _chainId: number | undefined
) {
  const { address, walletType = 'embedded', connectorId, connectorName } = internalState

  if (status === 'creating' || status === 'fetching-wallets') {
    return {
      normalizedStatus: 'connecting',
      walletType: null,
      connectorId: undefined,
      connectorName: undefined,
      isConnected: false,
      isConnecting: true,
      isDisconnected: false,
      isReconnecting: false,
      isEmbedded: false,
      isExternal: false,
    }
  }

  if (status === 'connecting' || status === 'reconnecting') {
    return {
      normalizedStatus: status === 'reconnecting' ? 'connecting' : 'connecting',
      walletType: walletType ?? null,
      connectorId,
      connectorName,
      isConnected: false,
      isConnecting: true,
      isDisconnected: false,
      isReconnecting: status === 'reconnecting',
      isEmbedded: walletType === 'embedded',
      isExternal: walletType === 'external',
    }
  }

  if ((status === 'connected' || status === 'needs-recovery') && address && activeWallet) {
    return {
      normalizedStatus: 'connected',
      walletType: walletType ?? 'embedded',
      connectorId: connectorId ?? embeddedWalletId,
      connectorName: connectorName ?? 'Openfort',
      isConnected: status === 'connected',
      isConnecting: false,
      isDisconnected: false,
      isReconnecting: false,
      isEmbedded: walletType === 'embedded',
      isExternal: walletType === 'external',
    }
  }

  return {
    normalizedStatus: 'disconnected',
    walletType: null,
    connectorId: undefined,
    connectorName: undefined,
    isConnected: false,
    isConnecting: false,
    isDisconnected: true,
    isReconnecting: false,
    isEmbedded: false,
    isExternal: false,
  }
}

const DEFAULT_CHAIN_ID = 13337

/**
 * Returns state for EVM embedded wallets: create, recover, list, active wallet, and provider.
 * Use for creating accounts, recovering existing ones, and signing transactions.
 *
 * @param options - Optional chainId override for multi-chain
 * @returns State with status, wallets, activeWallet, create, recover, setActive, provider
 *
 * @example
 * ```tsx
 * const evm = useEthereumEmbeddedWallet()
 * if (evm.status === 'connected') {
 *   const sig = await evm.provider?.request({ method: 'personal_sign', params: [hash, address] })
 * }
 * ```
 */
export function useEthereumEmbeddedWallet(options?: UseEmbeddedEthereumWalletOptions): EmbeddedEthereumWalletState {
  const {
    client,
    embeddedAccounts,
    embeddedState,
    isLoadingAccounts,
    updateEmbeddedAccounts,
    setActiveEmbeddedAddress,
    setWalletStatus,
    activeEmbeddedAddress,
    activeChainId,
  } = useOpenfortCore()
  const { walletConfig } = useOpenfort()
  const strategy = useConnectionStrategy()
  const bridge = useContext(OpenfortEthereumBridgeContext)

  const creationChainId = options?.chainId ?? DEFAULT_CHAIN_ID
  const activeReturnChainId = activeChainId ?? strategy?.getChainId() ?? DEFAULT_CHAIN_ID

  const setActiveInProgressRef = useRef<Promise<void> | null>(null)
  const autoReconnectAttemptedRef = useRef(false)

  const [state, setState] = useState<InternalState>({
    status: 'disconnected',
    activeWallet: null,
    provider: null,
    error: null,
  })

  const ethereumAccounts = useMemo(() => {
    if (!embeddedAccounts) return []
    return embeddedAccounts.filter((acc) => acc.chainType === ChainTypeEnum.EVM)
  }, [embeddedAccounts])

  const getEmbeddedEthereumProvider = useCallback(async (): Promise<OpenfortEmbeddedEthereumWalletProvider> => {
    const provider = await client.embeddedWallet.getEthereumProvider()
    return provider as OpenfortEmbeddedEthereumWalletProvider
  }, [client])

  const wallets = useMemo<ConnectedEmbeddedEthereumWallet[]>(() => {
    const uniqueAddresses = new Map<string, EmbeddedAccount>()
    for (const acc of ethereumAccounts) {
      const key = acc.address.toLowerCase()
      if (!uniqueAddresses.has(key)) {
        uniqueAddresses.set(key, acc)
      }
    }

    return Array.from(uniqueAddresses.values()).map((acc, index) => ({
      id: acc.id,
      address: acc.address as `0x${string}`,
      ownerAddress: acc.ownerAddress,
      implementationType: acc.implementationType,
      chainType: ChainTypeEnum.EVM,
      walletIndex: index,
      recoveryMethod: acc.recoveryMethod,
      getProvider: getEmbeddedEthereumProvider,
    }))
  }, [ethereumAccounts, getEmbeddedEthereumProvider])

  useEffect(() => {
    if (state.status === 'creating') {
      setWalletStatus({ status: 'creating' })
    } else if (state.status === 'connecting' && state.activeWallet) {
      setWalletStatus({ status: 'connecting', address: state.activeWallet.address })
    } else {
      setWalletStatus({ status: 'idle' })
    }
  }, [state.status, state.activeWallet, setWalletStatus])

  const create = useCallback(
    async (createOptions?: CreateEthereumWalletOptions): Promise<EmbeddedAccount> => {
      setState((s) => ({ ...s, status: 'creating', error: null }))

      try {
        if (!walletConfig) {
          throw new OpenfortError('Wallet config not found', OpenfortErrorCode.INVALID_CONFIG)
        }

        const recoveryParams = await buildRecoveryParams(
          {
            recoveryMethod: createOptions?.recoveryMethod,
            passkeyId: createOptions?.passkeyId,
            password: createOptions?.recoveryPassword,
            otpCode: createOptions?.otpCode,
          },
          {
            walletConfig,
            getAccessToken: () => client.getAccessToken(),
            getUserId: async () => {
              const user = await client.user.get()
              return user?.id
            },
          }
        )

        // Determine account type
        const accountType =
          createOptions?.accountType === 'EOA'
            ? AccountTypeEnum.EOA
            : (walletConfig.accountType ?? AccountTypeEnum.SMART_ACCOUNT)

        const account = await client.embeddedWallet.create({
          chainType: ChainTypeEnum.EVM,
          accountType,
          ...(accountType !== AccountTypeEnum.EOA && { chainId: createOptions?.chainId ?? creationChainId }),
          recoveryParams,
        })

        await updateEmbeddedAccounts({ silent: true })

        const provider = await getEmbeddedEthereumProvider()
        const connectedWallet: ConnectedEmbeddedEthereumWallet = {
          id: account.id,
          address: account.address as `0x${string}`,
          ownerAddress: account.ownerAddress,
          implementationType: account.implementationType,
          chainType: ChainTypeEnum.EVM,
          walletIndex: 0,
          recoveryMethod: account.recoveryMethod,
          getProvider: async () => provider,
        }

        setState({
          status: 'connected',
          activeWallet: connectedWallet,
          provider,
          error: null,
        })
        setActiveEmbeddedAddress(account.address)

        createOptions?.onSuccess?.({ account })
        return account
      } catch (err) {
        const error =
          err instanceof OpenfortError
            ? err
            : new OpenfortError(
                formatErrorWithReason('Failed to create Ethereum wallet', err),
                OpenfortErrorCode.WALLET_CREATION_FAILED,
                { cause: err }
              )

        setState((s) => ({
          ...s,
          status: 'error',
          error: error.message,
        }))

        createOptions?.onError?.(error)
        throw error
      }
    },
    [
      client,
      walletConfig,
      creationChainId,
      getEmbeddedEthereumProvider,
      updateEmbeddedAccounts,
      setActiveEmbeddedAddress,
    ]
  )

  const setActive = useCallback(
    async (activeOptions: SetActiveEthereumWalletOptions): Promise<void> => {
      const run = async (): Promise<void> => {
        const account = ethereumAccounts.find(
          (acc) => acc.address.toLowerCase() === activeOptions.address.toLowerCase()
        )

        if (!account) {
          throw new OpenfortError('Embedded wallet not found', OpenfortErrorCode.WALLET_NOT_FOUND, {
            cause: { address: activeOptions.address },
          })
        }

        const connectingStub: ConnectedEmbeddedEthereumWallet = {
          id: account.id,
          address: account.address as `0x${string}`,
          ownerAddress: account.ownerAddress,
          implementationType: account.implementationType,
          chainType: ChainTypeEnum.EVM,
          walletIndex: ethereumAccounts.indexOf(account),
          recoveryMethod: account.recoveryMethod,
          getProvider: async () => {
            throw new OpenfortError('Provider not ready yet', OpenfortErrorCode.WALLET_NOT_FOUND)
          },
        }
        setState((s) => ({ ...s, status: 'connecting', activeWallet: connectingStub, error: null }))

        try {
          const password = activeOptions.recoveryPassword
          const hasExplicitRecovery =
            activeOptions.recoveryParams != null || password != null || activeOptions.recoveryMethod !== undefined

          let recoveryParams = activeOptions.recoveryParams
          if (!recoveryParams && !hasExplicitRecovery) {
            if (account.recoveryMethod === RecoveryMethod.PASSKEY) {
              recoveryParams = { recoveryMethod: RecoveryMethod.PASSKEY }
              if (activeOptions.passkeyId)
                (recoveryParams as typeof recoveryParams & { passkeyId?: string }).passkeyId = activeOptions.passkeyId
            } else if (account.recoveryMethod === RecoveryMethod.PASSWORD) {
              setState((s) => ({ ...s, status: 'needs-recovery', error: null }))
              return
            } else {
              recoveryParams = await buildRecoveryParams(
                { recoveryMethod: undefined, otpCode: activeOptions.otpCode },
                {
                  walletConfig,
                  getAccessToken: () => client.getAccessToken(),
                  getUserId: async () => (await client.user.get())?.id,
                }
              )
            }
          } else if (!recoveryParams && hasExplicitRecovery) {
            recoveryParams = await buildRecoveryParams(
              {
                recoveryMethod:
                  activeOptions.recoveryMethod ?? (password != null ? RecoveryMethod.PASSWORD : undefined),
                passkeyId: activeOptions.passkeyId,
                password,
                otpCode: activeOptions.otpCode,
              },
              {
                walletConfig,
                getAccessToken: () => client.getAccessToken(),
                getUserId: async () => (await client.user.get())?.id,
              }
            )
          }

          if (recoveryParams) {
            await client.embeddedWallet.recover({
              account: account.id,
              recoveryParams,
            })
          }

          const provider = await getEmbeddedEthereumProvider()
          const connectedWallet: ConnectedEmbeddedEthereumWallet = {
            id: account.id,
            address: account.address as `0x${string}`,
            ownerAddress: account.ownerAddress,
            implementationType: account.implementationType,
            chainType: ChainTypeEnum.EVM,
            walletIndex: ethereumAccounts.indexOf(account),
            recoveryMethod: account.recoveryMethod,
            getProvider: async () => provider,
          }

          setState({
            status: 'connected',
            activeWallet: connectedWallet,
            provider,
            error: null,
          })
          setActiveEmbeddedAddress(account.address)
        } catch (err) {
          const error =
            err instanceof OpenfortError
              ? err
              : new OpenfortError(
                  formatErrorWithReason('Failed to set active Ethereum wallet', err),
                  OpenfortErrorCode.WALLET_NOT_FOUND,
                  { cause: err }
                )

          setState((s) => ({
            ...s,
            status: 'error',
            error: error.message,
          }))

          throw error
        }
      }

      const prev = setActiveInProgressRef.current
      if (prev) await prev
      const promise = run()
      setActiveInProgressRef.current = promise
      try {
        await promise
      } finally {
        if (setActiveInProgressRef.current === promise) setActiveInProgressRef.current = null
      }
    },
    [client, walletConfig, ethereumAccounts, getEmbeddedEthereumProvider, setActiveEmbeddedAddress]
  )

  const setRecovery = useCallback(
    async (recoveryOptions: SetRecoveryOptions): Promise<void> => {
      try {
        await client.embeddedWallet.setRecoveryMethod(recoveryOptions.previousRecovery, recoveryOptions.newRecovery)
        await updateEmbeddedAccounts({ silent: true })
      } catch (err) {
        const error =
          err instanceof OpenfortError
            ? err
            : new OpenfortError(
                formatErrorWithReason('Failed to set recovery method', err),
                OpenfortErrorCode.WALLET_RECOVERY_REQUIRED,
                { cause: err }
              )
        throw error
      }
    },
    [client, updateEmbeddedAccounts]
  )

  const exportPrivateKey = useCallback(async (): Promise<string> => {
    return await client.embeddedWallet.exportPrivateKey()
  }, [client])

  const actions = useMemo(
    () => ({
      create,
      wallets,
      setActive,
      setRecovery,
      exportPrivateKey,
    }),
    [create, wallets, setActive, setRecovery, exportPrivateKey]
  )

  useEffect(() => {
    let cancelled = false
    if (
      isLoadingAccounts ||
      ethereumAccounts.length === 0 ||
      embeddedState !== EmbeddedState.READY ||
      state.status === 'connecting' ||
      state.status === 'reconnecting' ||
      state.status === 'creating'
    ) {
      return
    }
    const accountByAddress = activeEmbeddedAddress
      ? ethereumAccounts.find((acc) => acc.address.toLowerCase() === activeEmbeddedAddress.toLowerCase())
      : undefined
    const currentMatches =
      state.status === 'connected' && state.activeWallet?.address.toLowerCase() === activeEmbeddedAddress?.toLowerCase()

    if (accountByAddress && !currentMatches) {
      getEmbeddedEthereumProvider().then((provider) => {
        if (cancelled) return
        const connectedWallet: ConnectedEmbeddedEthereumWallet = {
          id: accountByAddress.id,
          address: accountByAddress.address as `0x${string}`,
          ownerAddress: accountByAddress.ownerAddress,
          implementationType: accountByAddress.implementationType,
          chainType: ChainTypeEnum.EVM,
          walletIndex: ethereumAccounts.indexOf(accountByAddress),
          recoveryMethod: accountByAddress.recoveryMethod,
          getProvider: async () => provider,
        }
        setState({ status: 'connected', activeWallet: connectedWallet, provider, error: null })
        setActiveEmbeddedAddress(accountByAddress.address)
      })
      return () => {
        cancelled = true
      }
    }

    if (state.status !== 'disconnected') return
    if (autoReconnectAttemptedRef.current) return
    autoReconnectAttemptedRef.current = true
    client.embeddedWallet
      .get()
      .then(async (active: EmbeddedAccount | null | undefined) => {
        if (cancelled || !active || active.chainType !== ChainTypeEnum.EVM) return
        const account = ethereumAccounts.find(
          (acc) => acc.address.toLowerCase() === (active.address as string).toLowerCase()
        )
        if (!account) return
        const provider = await getEmbeddedEthereumProvider()
        if (cancelled) return
        const connectedWallet: ConnectedEmbeddedEthereumWallet = {
          id: account.id,
          address: account.address as `0x${string}`,
          ownerAddress: account.ownerAddress,
          implementationType: account.implementationType,
          chainType: ChainTypeEnum.EVM,
          walletIndex: ethereumAccounts.indexOf(account),
          recoveryMethod: account.recoveryMethod,
          getProvider: async () => provider,
        }
        setState({
          status: 'connected',
          activeWallet: connectedWallet,
          provider,
          error: null,
        })
        setActiveEmbeddedAddress(account.address)
      })
      .catch((err) => {
        logger.warn('Failed to get active Ethereum wallet', err)
      })
    return () => {
      cancelled = true
    }
  }, [
    isLoadingAccounts,
    state.status,
    state.activeWallet?.address,
    ethereumAccounts,
    embeddedState,
    activeEmbeddedAddress,
    client,
    getEmbeddedEthereumProvider,
    setActiveEmbeddedAddress,
  ])

  const derived = useMemo(
    () => ({
      isLoading:
        state.status === 'fetching-wallets' ||
        state.status === 'connecting' ||
        state.status === 'creating' ||
        state.status === 'reconnecting',
      isError: state.status === 'error',
      isSuccess: state.status === 'connected',
    }),
    [state.status]
  )

  // Compute wallet type and connector info based on strategy and bridge
  const walletTypeInfo = useMemo(() => {
    if (strategy?.kind !== 'bridge' || !bridge || !state.activeWallet) {
      return { walletType: 'embedded' as const, connectorId: embeddedWalletId, connectorName: 'Openfort' }
    }

    const bridgeConnector = bridge.account.connector
    const isEmbedded =
      bridgeConnector?.id === embeddedWalletId ||
      (activeEmbeddedAddress != null &&
        activeEmbeddedAddress.toLowerCase() === state.activeWallet.address.toLowerCase())

    if (isEmbedded) {
      return { walletType: 'embedded' as const, connectorId: embeddedWalletId, connectorName: 'Openfort' }
    }
    return {
      walletType: 'external' as const,
      connectorId: bridgeConnector?.id,
      connectorName: bridgeConnector?.name,
    }
  }, [strategy, bridge, state.activeWallet, activeEmbeddedAddress])

  const connectedStateProps = useMemo(
    () =>
      toConnectedStateProperties(
        state.status,
        {
          address: state.activeWallet?.address,
          walletType: walletTypeInfo.walletType,
          connectorId: walletTypeInfo.connectorId,
          connectorName: walletTypeInfo.connectorName,
        },
        state.activeWallet,
        state.activeWallet?.address ? activeReturnChainId : undefined
      ),
    [state.status, state.activeWallet, walletTypeInfo, activeReturnChainId]
  )

  // Compute displayAddress when connected
  const displayAddress = useMemo(
    () =>
      state.activeWallet?.address && (state.status === 'connected' || state.status === 'connecting')
        ? formatAddress(state.activeWallet.address, ChainTypeEnum.EVM)
        : undefined,
    [state.activeWallet?.address, state.status]
  )

  if (isLoadingAccounts) {
    return {
      ...actions,
      status: 'fetching-wallets',
      activeWallet: null,
      isLoading: true,
      isError: false,
      isSuccess: false,
      normalizedStatus: 'connecting',
      walletType: null,
      isConnected: false,
      isConnecting: true,
      isDisconnected: false,
      isReconnecting: false,
      isEmbedded: false,
      isExternal: false,
    } as EmbeddedEthereumWalletState
  }

  return {
    ...buildEmbeddedWalletStatusResult(state, actions),
    ...derived,
    ...connectedStateProps,
    ...(displayAddress && { displayAddress }),
    ...(state.activeWallet?.address && { address: state.activeWallet.address }),
    chainId: activeReturnChainId,
  } as EmbeddedEthereumWalletState
}
