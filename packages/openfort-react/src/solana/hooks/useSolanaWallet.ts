/**
 * Solana Wallet Hook
 *
 * Main hook for managing Solana embedded wallets.
 * Uses the new core module (Phase A) and shared recovery utilities.
 *
 * Returns a discriminated union with 8 possible states.
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
import { getTransactionBytes } from '../operations'
import { createSolanaProvider } from '../provider'
import { useSolanaContext } from '../providers/SolanaContextProvider'
import type {
  ConnectedEmbeddedSolanaWallet,
  CreateSolanaWalletOptions,
  EmbeddedSolanaWalletState,
  OpenfortEmbeddedSolanaWalletProvider,
  SetActiveSolanaWalletOptions,
  SetRecoveryOptions,
  SignedSolanaTransaction,
  SolanaTransaction,
  UseEmbeddedSolanaWalletOptions,
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
  activeWallet: ConnectedEmbeddedSolanaWallet | null
  provider: OpenfortEmbeddedSolanaWalletProvider | null
  error: string | null
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Hook for managing Solana embedded wallets
 *
 * Requires SolanaContext to be configured (via walletConfig.solana).
 *
 * @param options - Hook options including recovery params
 * @returns Discriminated union of wallet states with actions
 *
 * @example
 * ```tsx
 * const solana = useSolanaWallet();
 *
 * switch (solana.status) {
 *   case 'disconnected':
 *     return <button onClick={() => solana.create()}>Create Wallet</button>;
 *   case 'connected':
 *     return <p>Address: {solana.activeWallet.address}</p>;
 *   case 'error':
 *     return <p>Error: {solana.error}</p>;
 * }
 * ```
 */
export function useSolanaWallet(_options?: UseEmbeddedSolanaWalletOptions): EmbeddedSolanaWalletState {
  // Ensure Solana context is available (required for Solana)
  useSolanaContext()

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
  // Filter Solana wallets from embedded accounts
  // ==========================================================================

  const solanaAccounts = useMemo(() => {
    if (!embeddedAccounts) return []
    return embeddedAccounts.filter((acc) => acc.chainType === ChainTypeEnum.SVM)
  }, [embeddedAccounts])

  // ==========================================================================
  // Convert embedded accounts to ConnectedEmbeddedSolanaWallet
  // ==========================================================================

  const wallets = useMemo<ConnectedEmbeddedSolanaWallet[]>(() => {
    return solanaAccounts.map((acc, index) => ({
      address: acc.address,
      chainType: ChainTypeEnum.SVM,
      walletIndex: index,
      getProvider: async () => {
        // Create provider when requested
        return createProviderForAccount(acc)
      },
    }))
  }, [solanaAccounts])

  // ==========================================================================
  // Create provider for account
  // ==========================================================================

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

  // ==========================================================================
  // Actions
  // ==========================================================================

  /**
   * Create a new Solana embedded wallet
   */
  const create = useCallback(
    async (createOptions?: CreateSolanaWalletOptions): Promise<EmbeddedAccount> => {
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

        // Create the wallet (Solana wallets are always EOA - no Smart Accounts)
        const account = await client.embeddedWallet.create({
          chainType: ChainTypeEnum.SVM,
          accountType: AccountTypeEnum.EOA,
          recoveryParams,
        })

        // Refresh embedded accounts
        await refetchAccounts()

        // Create provider and update state
        const provider = createProviderForAccount(account)
        const connectedWallet: ConnectedEmbeddedSolanaWallet = {
          address: account.address,
          chainType: ChainTypeEnum.SVM,
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
    [client, walletConfig, createProviderForAccount, refetchAccounts, recoveryContext]
  )

  /**
   * Set the active Solana wallet
   */
  const setActive = useCallback(
    async (activeOptions: SetActiveSolanaWalletOptions): Promise<void> => {
      setState((s) => ({ ...s, status: 'connecting', error: null }))

      try {
        // Find the account
        const account = solanaAccounts.find((acc) => acc.address.toLowerCase() === activeOptions.address.toLowerCase())

        if (!account) {
          throw new OpenfortReactError(
            `Solana wallet not found: ${activeOptions.address}`,
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
        const provider = createProviderForAccount(account)
        const connectedWallet: ConnectedEmbeddedSolanaWallet = {
          address: account.address,
          chainType: ChainTypeEnum.SVM,
          walletIndex: solanaAccounts.indexOf(account),
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
    [client, solanaAccounts, createProviderForAccount]
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
