import { AccountTypeEnum, ChainTypeEnum, type EmbeddedAccount, RecoveryMethod } from '@openfort/openfort-js'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useOpenfort } from '../../components/Openfort/useOpenfort'
import { useOpenfortCore } from '../../openfort/useOpenfort'
import type { SetRecoveryOptions, WalletStatus } from '../../shared/types'
import { OpenfortError, OpenfortReactErrorType } from '../../types'
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
import { buildRecoveryParams } from './utils'

type InternalState = {
  status: WalletStatus
  activeWallet: ConnectedEmbeddedSolanaWallet | null
  provider: OpenfortEmbeddedSolanaWalletProvider | null
  error: string | null
}

/** Hook for managing Solana embedded wallets. */
export function useSolanaEmbeddedWallet(_options?: UseEmbeddedSolanaWalletOptions): EmbeddedSolanaWalletState {
  const { client, embeddedAccounts, isLoadingAccounts, updateEmbeddedAccounts, setActiveEmbeddedAddress } =
    useOpenfortCore()
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
          // CRITICAL: Use hashMessage: false for Ed25519 (Solana)
          const signature = await client.embeddedWallet.signMessage(message, {
            hashMessage: false, // Ed25519 - no keccak256
          })
          return signature as string
        },
        signTransaction: async (transaction: SolanaTransaction): Promise<SignedSolanaTransaction> => {
          const messageBytes = getTransactionBytes(transaction)
          // Sign the transaction bytes (base64 encoded)
          const signature = await client.embeddedWallet.signMessage(Buffer.from(messageBytes).toString('base64'), {
            hashMessage: false, // Ed25519 - no keccak256
          })
          return {
            signature: signature as string,
            publicKey: account.address,
          }
        },
        signAllTransactions: async (transactions: SolanaTransaction[]): Promise<SignedSolanaTransaction[]> => {
          // Sign each transaction
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

  const create = useCallback(
    async (createOptions?: CreateSolanaWalletOptions): Promise<EmbeddedAccount> => {
      setState((s) => ({ ...s, status: 'creating', error: null }))

      try {
        if (!walletConfig) {
          throw new OpenfortError('Wallet config not found', OpenfortReactErrorType.CONFIGURATION_ERROR)
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

        // Create the wallet (Solana wallets are always EOA - no Smart Accounts)
        const account = await client.embeddedWallet.create({
          chainType: ChainTypeEnum.SVM,
          accountType: AccountTypeEnum.EOA,
          recoveryParams,
        })

        await updateEmbeddedAccounts({ silent: true })

        // Create provider and update state
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
            : new OpenfortError('Failed to create Solana wallet', OpenfortReactErrorType.WALLET_ERROR, {
                error: err,
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
        const account = solanaAccounts.find((acc) => acc.address.toLowerCase() === activeOptions.address.toLowerCase())

        if (!account) {
          throw new OpenfortError(
            `Solana wallet not found: ${activeOptions.address}`,
            OpenfortReactErrorType.WALLET_ERROR
          )
        }

        const connectingStub: ConnectedEmbeddedSolanaWallet = {
          id: account.id,
          address: account.address,
          chainType: ChainTypeEnum.SVM,
          walletIndex: solanaAccounts.indexOf(account),
          recoveryMethod: account.recoveryMethod,
          getProvider: async () => {
            throw new OpenfortError('Provider not ready yet', OpenfortReactErrorType.WALLET_ERROR)
          },
        }
        setState((s) => ({ ...s, status: 'connecting', activeWallet: connectingStub, error: null }))

        try {
          const password = activeOptions.password ?? activeOptions.recoveryPassword
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
                  getUserId: () => client.user.get().then((u) => u?.id),
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
                getUserId: () => client.user.get().then((u) => u?.id),
              }
            )
          }

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
              : new OpenfortError('Failed to set active Solana wallet', OpenfortReactErrorType.WALLET_ERROR, {
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
            : new OpenfortError('Failed to set recovery method', OpenfortReactErrorType.WALLET_ERROR, {
                error: err,
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
      solanaAccounts.length === 0 ||
      autoReconnectAttemptedRef.current
    ) {
      return
    }
    autoReconnectAttemptedRef.current = true
    let cancelled = false
    client.embeddedWallet
      .get()
      .then((active: EmbeddedAccount | null | undefined) => {
        if (cancelled || !active || active.chainType !== ChainTypeEnum.SVM) return
        const account = solanaAccounts.find((acc) => acc.address.toLowerCase() === active.address.toLowerCase())
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
        autoReconnectAttemptedRef.current = false
      })
    return () => {
      cancelled = true
    }
  }, [isLoadingAccounts, state.status, solanaAccounts, client, createProviderForAccount, setActiveEmbeddedAddress])

  // Handle loading state
  if (isLoadingAccounts) {
    return {
      ...actions,
      status: 'fetching-wallets',
      activeWallet: null,
    } as EmbeddedSolanaWalletState
  }

  // Return discriminated union based on status
  switch (state.status) {
    case 'disconnected':
      return {
        ...actions,
        status: 'disconnected',
        activeWallet: null,
      } as EmbeddedSolanaWalletState

    case 'fetching-wallets':
      return {
        ...actions,
        status: 'fetching-wallets',
        activeWallet: null,
      } as EmbeddedSolanaWalletState

    case 'connecting':
      return {
        ...actions,
        status: 'connecting',
        activeWallet: state.activeWallet!,
      } as EmbeddedSolanaWalletState

    case 'reconnecting':
      return {
        ...actions,
        status: 'reconnecting',
        activeWallet: state.activeWallet!,
      } as EmbeddedSolanaWalletState

    case 'creating':
      return {
        ...actions,
        status: 'creating',
        activeWallet: null,
      } as EmbeddedSolanaWalletState

    case 'needs-recovery':
      return {
        ...actions,
        status: 'needs-recovery',
        activeWallet: state.activeWallet!,
      } as EmbeddedSolanaWalletState

    case 'connected':
      return {
        ...actions,
        status: 'connected',
        activeWallet: state.activeWallet!,
        provider: state.provider!,
      } as EmbeddedSolanaWalletState

    case 'error':
      return {
        ...actions,
        status: 'error',
        activeWallet: state.activeWallet,
        error: state.error!,
      } as EmbeddedSolanaWalletState

    default:
      return {
        ...actions,
        status: 'disconnected',
        activeWallet: null,
      } as EmbeddedSolanaWalletState
  }
}

function getTransactionBytes(transaction: SolanaTransaction): Uint8Array {
  if (transaction instanceof Uint8Array) {
    return transaction
  }
  if ('messageBytes' in transaction) {
    return transaction.messageBytes
  }
  if ('serializeMessage' in transaction && typeof transaction.serializeMessage === 'function') {
    return transaction.serializeMessage()
  }
  throw new OpenfortError('Unsupported transaction format', OpenfortReactErrorType.VALIDATION_ERROR)
}
