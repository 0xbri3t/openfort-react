import { AccountTypeEnum, ChainTypeEnum, type EmbeddedAccount, EmbeddedState } from '@openfort/openfort-js'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useOpenfort } from '../../components/Openfort/useOpenfort'
import { OpenfortError, OpenfortErrorCode } from '../../core/errors'
import { useOpenfortCore } from '../../openfort/useOpenfort'
import type { SetRecoveryOptions, WalletStatus } from '../../shared/types'
import { buildEmbeddedWalletStatusResult } from '../../shared/utils/embeddedWalletStatusMapper'
import { type BuildRecoveryParamsConfig, buildRecoveryParams } from '../../shared/utils/recovery'
import { logger } from '../../utils/logger'
import { getTransactionBytes } from '../operations'
import { createSolanaProvider } from '../provider'
import type {
  ConnectedEmbeddedSolanaWallet,
  CreateSolanaWalletOptions,
  EmbeddedSolanaWalletState,
  OpenfortEmbeddedSolanaWalletProvider,
  SetActiveSolanaWalletOptions,
  SignedSolanaTransaction,
  SolanaTransaction,
  UseEmbeddedSolanaWalletOptions,
} from '../types'
import { resolveRecoveryForSetActive } from './recoveryResolver'

type InternalState = {
  status: WalletStatus
  activeWallet: ConnectedEmbeddedSolanaWallet | null
  provider: OpenfortEmbeddedSolanaWalletProvider | null
  error: string | null
}

/**
 * Returns state for Solana embedded wallets: create, recover, list, active wallet, and provider.
 * Use for creating accounts, recovering existing ones, and signing transactions.
 *
 * @param _options - Reserved for future options
 * @returns State with status, wallets, activeWallet, create, recover, setActive, provider
 *
 * @example
 * ```tsx
 * const solana = useSolanaEmbeddedWallet()
 * if (solana.status === 'connected' && solana.provider) {
 *   const sig = await solana.provider.signTransaction(tx)
 * }
 * ```
 */
export function useSolanaEmbeddedWallet(_options?: UseEmbeddedSolanaWalletOptions): EmbeddedSolanaWalletState {
  const {
    client,
    embeddedAccounts,
    embeddedState,
    isLoadingAccounts,
    activeEmbeddedAddress,
    updateEmbeddedAccounts,
    setActiveEmbeddedAddress,
    setWalletStatus,
  } = useOpenfortCore()
  const { walletConfig } = useOpenfort()

  const setActiveInProgressRef = useRef<Promise<void> | null>(null)
  const autoReconnectAttemptedRef = useRef(false)

  const [state, setState] = useState<InternalState>({
    status: 'disconnected',
    activeWallet: null,
    provider: null,
    error: null,
  })

  const solanaAccounts = useMemo(() => {
    if (!embeddedAccounts) return []
    return embeddedAccounts.filter((acc) => acc.chainType === ChainTypeEnum.SVM)
  }, [embeddedAccounts])

  const createProviderForAccount = useCallback(
    (account: EmbeddedAccount): OpenfortEmbeddedSolanaWalletProvider => {
      return createSolanaProvider({
        account,
        signMessage: async (message: string): Promise<string> => {
          const signature = await client.embeddedWallet.signMessage(message, {
            hashMessage: false, // Ed25519 - no keccak256
          })
          return signature as string
        },
        signTransaction: async (transaction: SolanaTransaction): Promise<SignedSolanaTransaction> => {
          const messageBytes = getTransactionBytes(transaction)
          const signature = await client.embeddedWallet.signMessage(Buffer.from(messageBytes).toString('base64'), {
            hashMessage: false, // Ed25519 - no keccak256
          })
          return {
            signature: signature as string,
            publicKey: account.address,
          }
        },
        signAllTransactions: async (transactions: SolanaTransaction[]): Promise<SignedSolanaTransaction[]> => {
          const results = await Promise.all(
            transactions.map(async (tx) => {
              const messageBytes = getTransactionBytes(tx)
              const signature = await client.embeddedWallet.signMessage(Buffer.from(messageBytes).toString('base64'), {
                hashMessage: false, // Ed25519 - no keccak256
              })
              return {
                signature: signature as string,
                publicKey: account.address,
              }
            })
          )
          return results
        },
      })
    },
    [client]
  )

  const wallets = useMemo<ConnectedEmbeddedSolanaWallet[]>(() => {
    return solanaAccounts.map((acc, index) => ({
      id: acc.id,
      address: acc.address,
      chainType: ChainTypeEnum.SVM,
      walletIndex: index,
      recoveryMethod: acc.recoveryMethod,
      getProvider: async () => createProviderForAccount(acc),
    }))
  }, [solanaAccounts, createProviderForAccount])

  useEffect(() => {
    if (state.status === 'creating') {
      setWalletStatus({ status: 'creating' })
    } else if (state.status === 'connecting' && state.activeWallet) {
      setWalletStatus({ status: 'connecting' })
    } else {
      setWalletStatus({ status: 'idle' })
    }
  }, [state.status, state.activeWallet, setWalletStatus])

  const create = useCallback(
    async (createOptions?: CreateSolanaWalletOptions): Promise<EmbeddedAccount> => {
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
            getUserId: () => client.user.get().then((u) => u?.id),
          }
        )

        const account = await client.embeddedWallet.create({
          chainType: ChainTypeEnum.SVM,
          accountType: AccountTypeEnum.EOA,
          recoveryParams,
        })

        await updateEmbeddedAccounts({ silent: true })

        const provider = createProviderForAccount(account)
        const connectedWallet: ConnectedEmbeddedSolanaWallet = {
          id: account.id,
          address: account.address,
          chainType: ChainTypeEnum.SVM,
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
            : new OpenfortError('Failed to create Solana wallet', OpenfortErrorCode.WALLET_CREATION_FAILED, {
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
    [client, walletConfig, createProviderForAccount, updateEmbeddedAccounts, setActiveEmbeddedAddress]
  )

  const setActive = useCallback(
    async (activeOptions: SetActiveSolanaWalletOptions): Promise<void> => {
      const run = async (): Promise<void> => {
        const account = solanaAccounts.find((acc) => acc.address === activeOptions.address)

        if (!account) {
          throw new OpenfortError('Embedded wallet not found', OpenfortErrorCode.WALLET_NOT_FOUND, {
            cause: { address: activeOptions.address },
          })
        }

        const connectingStub: ConnectedEmbeddedSolanaWallet = {
          id: account.id,
          address: account.address,
          chainType: ChainTypeEnum.SVM,
          walletIndex: solanaAccounts.indexOf(account),
          recoveryMethod: account.recoveryMethod,
          getProvider: async () => {
            throw new OpenfortError('Provider not ready yet', OpenfortErrorCode.WALLET_NOT_FOUND)
          },
        }
        setState((s) => ({ ...s, status: 'connecting', activeWallet: connectingStub, error: null }))

        try {
          const config: BuildRecoveryParamsConfig = {
            walletConfig,
            getAccessToken: () => client.getAccessToken(),
            getUserId: () => client.user.get().then((u) => u?.id),
          }
          const resolved = await resolveRecoveryForSetActive(account, activeOptions, config)
          if (resolved.needsRecovery) {
            setState((s) => ({ ...s, status: 'needs-recovery', error: null }))
            return
          }

          const recoveryParams = resolved.recoveryParams
          if (recoveryParams) {
            await client.embeddedWallet.recover({
              account: account.id,
              recoveryParams,
            })
          }

          const provider = createProviderForAccount(account)
          const connectedWallet: ConnectedEmbeddedSolanaWallet = {
            id: account.id,
            address: account.address,
            chainType: ChainTypeEnum.SVM,
            walletIndex: solanaAccounts.indexOf(account),
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
              : new OpenfortError('Failed to set active Solana wallet', OpenfortErrorCode.WALLET_NOT_FOUND, {
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
    [client, walletConfig, solanaAccounts, createProviderForAccount, setActiveEmbeddedAddress]
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
      solanaAccounts.length === 0 ||
      embeddedState !== EmbeddedState.READY ||
      state.status === 'connecting' ||
      state.status === 'reconnecting' ||
      state.status === 'creating'
    ) {
      return
    }
    const accountByAddress = activeEmbeddedAddress
      ? solanaAccounts.find((acc) => acc.address === activeEmbeddedAddress)
      : undefined
    const currentMatches = state.status === 'connected' && state.activeWallet?.address === activeEmbeddedAddress
    if (!activeEmbeddedAddress && state.status === 'connected') {
      setState({ status: 'disconnected', activeWallet: null, provider: null, error: null })
      return
    }
    if (accountByAddress && !currentMatches) {
      const provider = createProviderForAccount(accountByAddress)
      const connectedWallet: ConnectedEmbeddedSolanaWallet = {
        id: accountByAddress.id,
        address: accountByAddress.address,
        chainType: ChainTypeEnum.SVM,
        walletIndex: solanaAccounts.indexOf(accountByAddress),
        recoveryMethod: accountByAddress.recoveryMethod,
        getProvider: async () => provider,
      }
      setState({
        status: 'connected',
        activeWallet: connectedWallet,
        provider,
        error: null,
      })
      return
    }
    if (state.status !== 'disconnected') return
    if (autoReconnectAttemptedRef.current) return
    autoReconnectAttemptedRef.current = true
    let cancelled = false
    client.embeddedWallet
      .get()
      .then((active: EmbeddedAccount | null | undefined) => {
        if (cancelled || !active || active.chainType !== ChainTypeEnum.SVM) return
        const account = solanaAccounts.find((acc) => acc.address === active.address)
        if (!account) return
        const provider = createProviderForAccount(account)
        const connectedWallet: ConnectedEmbeddedSolanaWallet = {
          id: account.id,
          address: account.address,
          chainType: ChainTypeEnum.SVM,
          walletIndex: solanaAccounts.indexOf(account),
          recoveryMethod: account.recoveryMethod,
          getProvider: async () => provider,
        }
        if (!cancelled) {
          setState({
            status: 'connected',
            activeWallet: connectedWallet,
            provider,
            error: null,
          })
          setActiveEmbeddedAddress(account.address)
        }
      })
      .catch(() => {
        logger.warn('Failed to get active Solana wallet')
      })
    return () => {
      cancelled = true
    }
  }, [
    isLoadingAccounts,
    state.status,
    state.activeWallet?.address,
    solanaAccounts,
    embeddedState,
    activeEmbeddedAddress,
    client,
    createProviderForAccount,
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

  if (isLoadingAccounts) {
    return {
      ...actions,
      status: 'fetching-wallets',
      activeWallet: null,
      isLoading: true,
      isError: false,
      isSuccess: false,
    } as EmbeddedSolanaWalletState
  }

  return { ...buildEmbeddedWalletStatusResult(state, actions), ...derived } as EmbeddedSolanaWalletState
}
