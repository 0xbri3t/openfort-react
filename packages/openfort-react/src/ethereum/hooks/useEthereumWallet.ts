/**
 * Ethereum Wallet Hook
 *
 * Main hook for managing Ethereum embedded wallets.
 * NO WAGMI DEPENDENCY - works standalone with optional EthereumContext.
 *
 * chainId resolution: options.chainId > EthereumContext.chainId > default (1)
 */

import { AccountTypeEnum, ChainTypeEnum, type EmbeddedAccount } from '@openfort/openfort-js'
import { useCallback, useMemo, useState } from 'react'

// Existing context for walletConfig
import { useOpenfort } from '../../components/Openfort/useOpenfort'
// Core module (Phase A)
import { useAuthContext } from '../../core/AuthContext'
import { OpenfortErrorCode, OpenfortReactError } from '../../core/errors'
import { useOpenfortClient } from '../../core/hooks/useOpenfortClient'

// Shared utilities
import { buildRecoveryParams, type RecoveryContext } from '../../shared/utils/recovery'

// Local imports
import { useEthereumContextSafe } from '../EthereumContext'
import type {
  ConnectedEmbeddedEthereumWallet,
  CreateEthereumWalletOptions,
  EmbeddedEthereumWalletState,
  OpenfortEmbeddedEthereumWalletProvider,
  SetActiveEthereumWalletOptions,
  SetRecoveryOptions,
  UseEmbeddedEthereumWalletOptions,
} from '../types'

// =============================================================================
// Internal Types
// =============================================================================

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

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Hook for managing Ethereum embedded wallets
 *
 * Works WITHOUT wagmi - uses optional EthereumContext or prop for chainId.
 * Defaults to Ethereum mainnet (chainId: 1) if no context or prop provided.
 *
 * @param options - Hook options including chainId and recovery params
 * @returns Discriminated union of wallet states with actions
 *
 * @example Without any wrapper (defaults to mainnet)
 * ```tsx
 * const ethereum = useEthereumWallet();
 * ```
 *
 * @example With specific chain
 * ```tsx
 * const ethereum = useEthereumWallet({ chainId: 137 });
 * ```
 *
 * @example With EthereumContext
 * ```tsx
 * <EthereumContextProvider chainId={137}>
 *   <App /> {// useEthereumWallet() uses 137 }
 * </EthereumContextProvider>
 * ```
 *
 * @example State handling
 * ```tsx
 * switch (ethereum.status) {
 *   case 'disconnected':
 *     return <button onClick={() => ethereum.create()}>Create Wallet</button>;
 *   case 'connected':
 *     return <p>Address: {ethereum.activeWallet.address}</p>;
 *   case 'error':
 *     return <p>Error: {ethereum.error}</p>;
 * }
 * ```
 */
export function useEthereumWallet(options?: UseEmbeddedEthereumWalletOptions): EmbeddedEthereumWalletState {
  // Get chainId: prop > context > default (mainnet)
  const ethereumContext = useEthereumContextSafe()
  const chainId = options?.chainId ?? ethereumContext?.chainId ?? 1

  // Use new core module
  const { client } = useOpenfortClient()
  const { embeddedAccounts, isLoadingAccounts, refetchAccounts } = useAuthContext()

  // Get walletConfig from existing context (for recovery)
  const { walletConfig } = useOpenfort()

  // Build recovery context for buildRecoveryParams
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

  // Internal state
  const [state, setState] = useState<InternalState>({
    status: 'disconnected',
    activeWallet: null,
    provider: null,
    error: null,
  })

  // ==========================================================================
  // Filter Ethereum wallets from embedded accounts
  // ==========================================================================

  const ethereumAccounts = useMemo(() => {
    if (!embeddedAccounts) return []
    return embeddedAccounts.filter((acc) => acc.chainType === ChainTypeEnum.EVM)
  }, [embeddedAccounts])

  // ==========================================================================
  // Convert embedded accounts to ConnectedEmbeddedEthereumWallet
  // ==========================================================================

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

  // ==========================================================================
  // Create provider for account
  // ==========================================================================

  const createProviderForAccount = useCallback(
    async (_account: EmbeddedAccount): Promise<OpenfortEmbeddedEthereumWalletProvider> => {
      // Get the EIP-1193 provider from the Openfort client
      const provider = await client.embeddedWallet.getEthereumProvider()
      return provider as OpenfortEmbeddedEthereumWalletProvider
    },
    [client]
  )

  // ==========================================================================
  // Actions
  // ==========================================================================

  /**
   * Create a new Ethereum embedded wallet
   */
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

  /**
   * Set the active Ethereum wallet
   */
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

  /**
   * Set recovery method for the wallet
   */
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

  /**
   * Export the private key
   */
  const exportPrivateKey = useCallback(async (): Promise<string> => {
    return await client.embeddedWallet.exportPrivateKey()
  }, [client])

  // ==========================================================================
  // Build actions object
  // ==========================================================================

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

  // ==========================================================================
  // Determine current status based on state
  // ==========================================================================

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
