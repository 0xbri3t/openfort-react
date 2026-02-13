import { AccountTypeEnum, ChainTypeEnum, type EmbeddedAccount, RecoveryMethod } from '@openfort/openfort-js'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useOpenfort } from '../../components/Openfort/useOpenfort'
import { OpenfortError, OpenfortErrorCode } from '../../core/errors'
import { useOpenfortCore } from '../../openfort/useOpenfort'
import type { SetRecoveryOptions, WalletStatus } from '../../shared/types'
import { buildEmbeddedWalletStatusResult } from '../../shared/utils/embeddedWalletStatusMapper'
import { logger } from '../../utils/logger'
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
    isLoadingAccounts,
    updateEmbeddedAccounts,
    setActiveEmbeddedAddress,
    setWalletStatus,
  } = useOpenfortCore()
  const { walletConfig } = useOpenfort()

  const chainId = options?.chainId ?? DEFAULT_CHAIN_ID

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
          ...(accountType !== AccountTypeEnum.EOA && { chainId: createOptions?.chainId ?? chainId }),
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
            : new OpenfortError('Failed to create Ethereum wallet', OpenfortErrorCode.WALLET_CREATION_FAILED, {
                cause: err,
              })

        setState((s) => ({
          ...s,
          status: 'error',
          error: error.message,
        }))

        createOptions?.onError?.(error)
        throw error
      }
    },
    [client, walletConfig, chainId, getEmbeddedEthereumProvider, updateEmbeddedAccounts, setActiveEmbeddedAddress]
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
              : new OpenfortError('Failed to set active Ethereum wallet', OpenfortErrorCode.WALLET_NOT_FOUND, {
                  cause: err,
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
            : new OpenfortError('Failed to set recovery method', OpenfortErrorCode.WALLET_RECOVERY_REQUIRED, {
                cause: err,
              })
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
    if (
      isLoadingAccounts ||
      state.status !== 'disconnected' ||
      ethereumAccounts.length === 0 ||
      autoReconnectAttemptedRef.current
    ) {
      return
    }
    autoReconnectAttemptedRef.current = true
    let cancelled = false
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
  }, [isLoadingAccounts, state.status, ethereumAccounts, client, getEmbeddedEthereumProvider, setActiveEmbeddedAddress])

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

  if (isLoadingAccounts) {
    return {
      ...actions,
      status: 'fetching-wallets',
      activeWallet: null,
      isLoading: true,
      isError: false,
      isSuccess: false,
    } as EmbeddedEthereumWalletState
  }

  return { ...buildEmbeddedWalletStatusResult(state, actions), ...derived } as EmbeddedEthereumWalletState
}
