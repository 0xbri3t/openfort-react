'use client'

import {
  AccountTypeEnum,
  ChainTypeEnum,
  type EmbeddedAccount,
  EmbeddedState,
  RecoveryMethod,
} from '@openfort/openfort-js'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useOpenfortUIContext as useOpenfort } from '../../components/Openfort/useOpenfort'
import { embeddedWalletId } from '../../constants/openfort'
import { useConnectionStrategy } from '../../core/ConnectionStrategyContext'
import { OpenfortError, OpenfortReactErrorType } from '../../core/errors'
import { useOpenfortCore } from '../../openfort/useOpenfort'
import type { CreateEmbeddedWalletOptions, SetRecoveryOptions, WalletStatus } from '../../shared/types'
import { buildEmbeddedWalletStatusResult } from '../../shared/utils/embeddedWalletStatusMapper'
import { formatAddress } from '../../utils/format'
import type {
  ConnectedEmbeddedEthereumWallet,
  EthereumWalletState,
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
  activeWallet: ConnectedEmbeddedEthereumWallet | null,
  _chainId: number | undefined
) {
  if (status === 'creating' || status === 'fetching-wallets') {
    return {
      embeddedWalletId: undefined,
      isConnected: false,
      isConnecting: true,
      isDisconnected: false,
      isReconnecting: false,
    }
  }

  if (status === 'connecting' || status === 'reconnecting') {
    return {
      embeddedWalletId,
      isConnected: false,
      isConnecting: true,
      isDisconnected: false,
      isReconnecting: status === 'reconnecting',
    }
  }

  if ((status === 'connected' || status === 'needs-recovery') && activeWallet) {
    return {
      embeddedWalletId,
      isConnected: status === 'connected',
      isConnecting: false,
      isDisconnected: false,
      isReconnecting: false,
    }
  }

  return {
    embeddedWalletId: undefined,
    isConnected: false,
    isConnecting: false,
    isDisconnected: true,
    isReconnecting: false,
  }
}

const DEFAULT_CHAIN_ID = 13337

function buildConnectedWallet(
  acc: EmbeddedAccount,
  index: number,
  getProvider: () => Promise<OpenfortEmbeddedEthereumWalletProvider>,
  overrides?: Partial<Pick<ConnectedEmbeddedEthereumWallet, 'isActive' | 'isConnecting' | 'getProvider'>>
): ConnectedEmbeddedEthereumWallet {
  return {
    id: acc.id,
    address: acc.address as `0x${string}`,
    ownerAddress: acc.ownerAddress,
    implementationType: acc.implementationType,
    chainType: ChainTypeEnum.EVM,
    walletIndex: index,
    recoveryMethod: acc.recoveryMethod,
    getProvider: overrides?.getProvider ?? getProvider,
    isAvailable: true,
    isActive: overrides?.isActive ?? false,
    isConnecting: overrides?.isConnecting ?? false,
    accounts: [{ id: acc.id, chainId: acc.chainId }],
    connectorType: 'embedded',
    walletClientType: 'openfort',
    accountId: acc.id,
    accountType: acc.accountType,
    createdAt: acc.createdAt,
    salt: acc.salt,
  }
}

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
export function useEthereumEmbeddedWallet(options?: UseEmbeddedEthereumWalletOptions): EthereumWalletState {
  const {
    client,
    embeddedAccounts,
    embeddedState,
    isLoadingAccounts,
    updateEmbeddedAccounts,
    setActiveEmbeddedAddress,
    setWalletStatus,
    activeEmbeddedAddress,
  } = useOpenfortCore()
  const { walletConfig, chainType } = useOpenfort()
  const strategy = useConnectionStrategy()

  const activeChainId = strategy?.getActiveChainId?.() ?? strategy?.getChainId()
  const setActiveChainId = strategy?.setActiveChainId ?? (() => {})

  const creationChainId = options?.chainId ?? DEFAULT_CHAIN_ID
  const activeReturnChainId = activeChainId ?? strategy?.getChainId() ?? DEFAULT_CHAIN_ID

  const setActiveInProgressRef = useRef<Promise<void> | null>(null)

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
    const activeAddr = state.activeWallet?.address.toLowerCase()
    const isConnecting = state.status === 'connecting' || state.status === 'reconnecting'

    return Array.from(uniqueAddresses.values()).map((acc, index) => {
      const addr = (acc.address as string).toLowerCase()
      return buildConnectedWallet(acc, index, getEmbeddedEthereumProvider, {
        isActive: state.status === 'connected' && activeAddr === addr,
        isConnecting: isConnecting && activeAddr === addr,
      })
    })
  }, [ethereumAccounts, getEmbeddedEthereumProvider, state.status, state.activeWallet])

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
    async (createOptions?: CreateEmbeddedWalletOptions): Promise<EmbeddedAccount> => {
      setState((s) => ({ ...s, status: 'creating', error: null }))

      try {
        if (!walletConfig) {
          throw new OpenfortError('Wallet config not found', OpenfortReactErrorType.CONFIGURATION_ERROR)
        }

        const recoveryParams = await buildRecoveryParams(
          {
            recoveryMethod: createOptions?.recoveryMethod,
            passkeyId: createOptions?.passkeyId,
            password: createOptions?.password,
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

        // Determine account type (use createOptions, then walletConfig, else default to Smart Account)
        const accountType =
          createOptions?.accountType ?? walletConfig?.ethereum?.accountType ?? AccountTypeEnum.SMART_ACCOUNT

        const account = await client.embeddedWallet.create({
          chainType: ChainTypeEnum.EVM,
          accountType,
          ...(accountType !== AccountTypeEnum.EOA && { chainId: createOptions?.chainId ?? creationChainId }),
          recoveryParams,
        })

        await updateEmbeddedAccounts({ silent: true })

        const provider = await getEmbeddedEthereumProvider()
        const connectedWallet = buildConnectedWallet(account, 0, async () => provider, {
          isActive: true,
          isConnecting: false,
        })

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
            : new OpenfortError('Failed to create Ethereum wallet', OpenfortReactErrorType.WALLET_ERROR, { error: err })

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
          throw new OpenfortError('Embedded wallet not found', OpenfortReactErrorType.WALLET_ERROR, {
            address: activeOptions.address,
          })
        }

        const connectingStub = buildConnectedWallet(
          account,
          ethereumAccounts.indexOf(account),
          getEmbeddedEthereumProvider,
          {
            isActive: false,
            isConnecting: true,
            getProvider: async () => {
              throw new OpenfortError('Provider not ready yet', OpenfortReactErrorType.WALLET_ERROR)
            },
          }
        )
        setState((s) => ({ ...s, status: 'connecting', activeWallet: connectingStub, error: null }))

        try {
          const password = activeOptions.password
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
          const connectedWallet = buildConnectedWallet(
            account,
            ethereumAccounts.indexOf(account),
            async () => provider,
            { isActive: true, isConnecting: false }
          )

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
              : new OpenfortError('Failed to set active Ethereum wallet', OpenfortReactErrorType.WALLET_ERROR, {
                  error: err,
                })

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
            : new OpenfortError('Failed to set recovery method', OpenfortReactErrorType.WALLET_ERROR, { error: err })
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
      activeChainId,
      setActiveChainId,
    }),
    [create, wallets, setActive, setRecovery, exportPrivateKey, activeChainId, setActiveChainId]
  )

  // Clear local state when core clears activeEmbeddedAddress (e.g. logout).
  useEffect(() => {
    if (!activeEmbeddedAddress && (state.status === 'connected' || state.status === 'needs-recovery')) {
      setState({ status: 'disconnected', activeWallet: null, provider: null, error: null })
    }
  }, [activeEmbeddedAddress, state.status])

  // Sync local state from core's activeEmbeddedAddress (single source of truth).
  useEffect(() => {
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

    if (!activeEmbeddedAddress && state.status === 'connected') {
      setState({ status: 'disconnected', activeWallet: null, provider: null, error: null })
      return
    }

    if (accountByAddress && !currentMatches) {
      let cancelled = false
      getEmbeddedEthereumProvider().then((provider) => {
        if (cancelled) return
        const connectedWallet = buildConnectedWallet(
          accountByAddress,
          ethereumAccounts.indexOf(accountByAddress),
          async () => provider,
          { isActive: true, isConnecting: false }
        )
        setState({ status: 'connected', activeWallet: connectedWallet, provider, error: null })
      })
      return () => {
        cancelled = true
      }
    }

    // activeEmbeddedAddress is from other chain (e.g. SVM); auto-activate first EVM wallet.
    // Only when on EVM view to prevent ping-pong with Solana hook.
    if (
      chainType === ChainTypeEnum.EVM &&
      !accountByAddress &&
      activeEmbeddedAddress &&
      ethereumAccounts.length > 0 &&
      state.status === 'disconnected'
    ) {
      setActiveEmbeddedAddress(ethereumAccounts[0].address)
    }
  }, [
    isLoadingAccounts,
    state.status,
    state.activeWallet?.address,
    ethereumAccounts,
    embeddedState,
    activeEmbeddedAddress,
    chainType,
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

  const connectedStateProps = useMemo(
    () =>
      toConnectedStateProperties(
        state.status,
        state.activeWallet,
        state.activeWallet?.address ? activeReturnChainId : undefined
      ),
    [state.status, state.activeWallet, activeReturnChainId]
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
      embeddedWalletId: undefined,
      isConnected: false,
      isConnecting: true,
      isDisconnected: false,
      isReconnecting: false,
    } as EthereumWalletState
  }

  return {
    ...buildEmbeddedWalletStatusResult(state, actions),
    ...derived,
    ...connectedStateProps,
    ...(displayAddress && { displayAddress }),
    ...(state.activeWallet?.address && { address: state.activeWallet.address }),
    chainId: activeReturnChainId,
  } as EthereumWalletState
}
