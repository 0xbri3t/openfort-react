import { AccountTypeEnum, ChainTypeEnum, type EmbeddedAccount } from '@openfort/openfort-js'
import { useCallback, useContext, useMemo, useState } from 'react'
import { useChainId, WagmiContext } from 'wagmi'
import { useOpenfort } from '../../components/Openfort/useOpenfort'
import { useOpenfortCore } from '../../openfort/useOpenfort'
import { OpenfortError, OpenfortReactErrorType } from '../../types'
import type {
  ConnectedEmbeddedEthereumWallet,
  CreateEthereumWalletOptions,
  EmbeddedEthereumWalletState,
  OpenfortEmbeddedEthereumWalletProvider,
  SetActiveEthereumWalletOptions,
  SetRecoveryOptions,
  UseEmbeddedEthereumWalletOptions,
} from '../types'
import { buildRecoveryParams } from './utils'

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

/**
 * Hook for managing Ethereum embedded wallets.
 * Requires WagmiProvider in the component tree.
 */
export function useEthereumEmbeddedWallet(options?: UseEmbeddedEthereumWalletOptions): EmbeddedEthereumWalletState {
  // Guard: Ensure WagmiProvider is present
  const wagmiContext = useContext(WagmiContext)
  if (!wagmiContext) {
    throw new OpenfortError(
      'useEthereumEmbeddedWallet requires WagmiProvider. ' +
        'Please wrap your app with WagmiProvider or use the Solana-only configuration.',
      OpenfortReactErrorType.CONFIGURATION_ERROR
    )
  }

  const { client, embeddedAccounts, isLoadingAccounts, updateEmbeddedAccounts } = useOpenfortCore()
  const { walletConfig } = useOpenfort()
  const wagmiChainId = useChainId()

  // Use provided chainId or fall back to wagmi chainId
  const chainId = options?.chainId ?? wagmiChainId

  // Internal state
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
      // Note: _account is available for future use if needed for per-account providers
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
          throw new OpenfortError('Wallet config not found', OpenfortReactErrorType.CONFIGURATION_ERROR)
        }

        // Build recovery params
        const recoveryParams = await buildRecoveryParams(
          {
            recoveryMethod: undefined, // Use default
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

        // Create the wallet
        const account = await client.embeddedWallet.create({
          chainType: ChainTypeEnum.EVM,
          accountType,
          ...(accountType !== AccountTypeEnum.EOA && { chainId: createOptions?.chainId ?? chainId }),
          recoveryParams,
        })

        // Refresh embedded accounts
        await updateEmbeddedAccounts()

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
        const error =
          err instanceof OpenfortError
            ? err
            : new OpenfortError('Failed to create Ethereum wallet', OpenfortReactErrorType.WALLET_ERROR, {
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
    [client, walletConfig, chainId, createProviderForAccount, updateEmbeddedAccounts]
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
          throw new OpenfortError(
            `Ethereum wallet not found: ${activeOptions.address}`,
            OpenfortReactErrorType.WALLET_ERROR
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
    },
    [client, ethereumAccounts, createProviderForAccount]
  )

  const setRecovery = useCallback(
    async (recoveryOptions: SetRecoveryOptions): Promise<void> => {
      try {
        await client.embeddedWallet.setRecoveryMethod(recoveryOptions.previousRecovery, recoveryOptions.newRecovery)
        await updateEmbeddedAccounts()
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
