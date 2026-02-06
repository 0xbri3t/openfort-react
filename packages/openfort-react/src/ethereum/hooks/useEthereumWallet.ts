import { AccountTypeEnum, ChainTypeEnum, type EmbeddedAccount } from '@openfort/openfort-js'
import { useCallback, useContext, useMemo, useState } from 'react'

import { useOpenfort } from '../../components/Openfort/useOpenfort'
import { useAuthContext } from '../../core/AuthContext'
import { OpenfortErrorCode, OpenfortReactError } from '../../core/errors'
import { useOpenfortClient } from '../../core/hooks/useOpenfortClient'
import { buildRecoveryParams, type RecoveryContext } from '../../shared/utils/recovery'
import { EthereumContext } from '../EthereumContext'
import type {
  ConnectedEmbeddedEthereumWallet,
  CreateEthereumWalletOptions,
  EmbeddedEthereumWalletState,
  OpenfortEmbeddedEthereumWalletProvider,
  SetActiveEthereumWalletOptions,
  SetRecoveryOptions,
  UseEmbeddedEthereumWalletOptions,
} from '../types'

type WalletStatus =
  | 'disconnected'
  | 'fetching-wallets'
  | 'connecting'
  | 'reconnecting'
  | 'creating'
  | 'needs-recovery'
  | 'connected'
  | 'error'

type InternalState = {
  status: WalletStatus
  activeWallet: ConnectedEmbeddedEthereumWallet | null
  provider: OpenfortEmbeddedEthereumWalletProvider | null
  error: string | null
}

/** Hook for managing Ethereum embedded wallets. Works without wagmi. */
export function useEthereumWallet(options?: UseEmbeddedEthereumWalletOptions): EmbeddedEthereumWalletState {
  const ethereumContext = useContext(EthereumContext)
  const chainId = options?.chainId ?? ethereumContext?.chainId ?? 1

  const { client } = useOpenfortClient()
  const { embeddedAccounts, isLoadingAccounts, refetchAccounts } = useAuthContext()
  const { walletConfig } = useOpenfort()

  const recoveryContext: RecoveryContext = useMemo(
    () => ({
      walletConfig,
      getAccessToken: () => client.getAccessToken(),
      getUserId: async () => {
        const user = await client.user.get()
        return user?.id
      },
    }),
    [walletConfig, client]
  )

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

  const wallets = useMemo<ConnectedEmbeddedEthereumWallet[]>(() => {
    // Deduplicate by address (same address can have multiple chainIds for Smart Accounts)
    const uniqueAddresses = new Map<string, EmbeddedAccount>()
    for (const acc of ethereumAccounts) {
      const key = acc.address.toLowerCase()
      if (!uniqueAddresses.has(key)) {
        uniqueAddresses.set(key, acc)
      }
    }

    return Array.from(uniqueAddresses.values()).map((acc, index) => ({
      address: acc.address as `0x${string}`,
      ownerAddress: acc.ownerAddress,
      implementationType: acc.implementationType,
      chainType: ChainTypeEnum.EVM,
      walletIndex: index,
      getProvider: async () => {
        return createProviderForAccount(acc)
      },
    }))
  }, [ethereumAccounts])

  const createProviderForAccount = useCallback(
    async (_account: EmbeddedAccount): Promise<OpenfortEmbeddedEthereumWalletProvider> => {
      // Get the EIP-1193 provider from the Openfort client
      const provider = await client.embeddedWallet.getEthereumProvider()
      return provider as OpenfortEmbeddedEthereumWalletProvider
    },
    [client]
  )

  const create = useCallback(
    async (createOptions?: CreateEthereumWalletOptions): Promise<EmbeddedAccount> => {
      setState((s) => ({ ...s, status: 'creating', error: null }))

      try {
        if (!walletConfig) {
          throw new OpenfortReactError('Wallet config not found', OpenfortErrorCode.INVALID_CONFIG)
        }

        // Build recovery params using shared utility
        const recoveryParams = await buildRecoveryParams(
          {
            recoveryMethod: undefined, // Use default
            password: createOptions?.recoveryPassword,
            otpCode: createOptions?.otpCode,
          },
          recoveryContext
        )

        // Determine account type
        const accountType =
          createOptions?.accountType === 'EOA'
            ? AccountTypeEnum.EOA
            : (walletConfig.accountType ?? AccountTypeEnum.SMART_ACCOUNT)

        // Create the wallet
        const account = await client.embeddedWallet.create({
          chainType: ChainTypeEnum.EVM,
          accountType,
          ...(accountType !== AccountTypeEnum.EOA && { chainId: createOptions?.chainId ?? chainId }),
          recoveryParams,
        })

        // Refresh embedded accounts
        await refetchAccounts()

        // Create provider and update state
        const provider = await createProviderForAccount(account)
        const connectedWallet: ConnectedEmbeddedEthereumWallet = {
          address: account.address as `0x${string}`,
          ownerAddress: account.ownerAddress,
          implementationType: account.implementationType,
          chainType: ChainTypeEnum.EVM,
          walletIndex: 0,
          getProvider: async () => provider,
        }

        setState({
          status: 'connected',
          activeWallet: connectedWallet,
          provider,
          error: null,
        })

        createOptions?.onSuccess?.({ account })
        return account
      } catch (err) {
        const error = OpenfortReactError.from(err, OpenfortErrorCode.WALLET_CREATION_FAILED)

        setState((s) => ({
          ...s,
          status: 'error',
          error: error.message,
        }))

        createOptions?.onError?.(error as any)
        throw error
      }
    },
    [client, walletConfig, chainId, createProviderForAccount, refetchAccounts, recoveryContext]
  )

  const setActive = useCallback(
    async (activeOptions: SetActiveEthereumWalletOptions): Promise<void> => {
      setState((s) => ({ ...s, status: 'connecting', error: null }))

      try {
        // Find the account
        const account = ethereumAccounts.find(
          (acc) => acc.address.toLowerCase() === activeOptions.address.toLowerCase()
        )

        if (!account) {
          throw new OpenfortReactError(
            `Ethereum wallet not found: ${activeOptions.address}`,
            OpenfortErrorCode.WALLET_NOT_FOUND
          )
        }

        // Recover if needed
        if (activeOptions.recoveryParams) {
          await client.embeddedWallet.recover({
            account: account.id,
            recoveryParams: activeOptions.recoveryParams,
          })
        }

        // Create provider
        const provider = await createProviderForAccount(account)
        const connectedWallet: ConnectedEmbeddedEthereumWallet = {
          address: account.address as `0x${string}`,
          ownerAddress: account.ownerAddress,
          implementationType: account.implementationType,
          chainType: ChainTypeEnum.EVM,
          walletIndex: ethereumAccounts.indexOf(account),
          getProvider: async () => provider,
        }

        setState({
          status: 'connected',
          activeWallet: connectedWallet,
          provider,
          error: null,
        })
      } catch (err) {
        const error = OpenfortReactError.from(err, OpenfortErrorCode.WALLET_NOT_FOUND)

        setState((s) => ({
          ...s,
          status: 'error',
          error: error.message,
        }))

        throw error
      }
    },
    [client, ethereumAccounts, createProviderForAccount]
  )

  const setRecovery = useCallback(
    async (recoveryOptions: SetRecoveryOptions): Promise<void> => {
      try {
        await client.embeddedWallet.setRecoveryMethod(recoveryOptions.previousRecovery, recoveryOptions.newRecovery)
        await refetchAccounts()
      } catch (err) {
        const error = OpenfortReactError.from(err, OpenfortErrorCode.WALLET_RECOVERY_REQUIRED)
        throw error
      }
    },
    [client, refetchAccounts]
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

  // Handle loading state
  if (isLoadingAccounts) {
    return {
      ...actions,
      status: 'fetching-wallets',
      activeWallet: null,
    } as EmbeddedEthereumWalletState
  }

  // Return discriminated union based on status
  switch (state.status) {
    case 'disconnected':
      return {
        ...actions,
        status: 'disconnected',
        activeWallet: null,
      } as EmbeddedEthereumWalletState

    case 'fetching-wallets':
      return {
        ...actions,
        status: 'fetching-wallets',
        activeWallet: null,
      } as EmbeddedEthereumWalletState

    case 'connecting':
      return {
        ...actions,
        status: 'connecting',
        activeWallet: state.activeWallet!,
      } as EmbeddedEthereumWalletState

    case 'reconnecting':
      return {
        ...actions,
        status: 'reconnecting',
        activeWallet: state.activeWallet!,
      } as EmbeddedEthereumWalletState

    case 'creating':
      return {
        ...actions,
        status: 'creating',
        activeWallet: null,
      } as EmbeddedEthereumWalletState

    case 'needs-recovery':
      return {
        ...actions,
        status: 'needs-recovery',
        activeWallet: state.activeWallet!,
      } as EmbeddedEthereumWalletState

    case 'connected':
      return {
        ...actions,
        status: 'connected',
        activeWallet: state.activeWallet!,
        provider: state.provider!,
      } as EmbeddedEthereumWalletState

    case 'error':
      return {
        ...actions,
        status: 'error',
        activeWallet: state.activeWallet,
        error: state.error!,
      } as EmbeddedEthereumWalletState

    default:
      return {
        ...actions,
        status: 'disconnected',
        activeWallet: null,
      } as EmbeddedEthereumWalletState
  }
}
