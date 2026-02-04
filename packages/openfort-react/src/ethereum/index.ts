/**
 * Ethereum-specific exports for @openfort/react/ethereum
 *
 * Import from '@openfort/react/ethereum' for Ethereum-only features.
 *
 * @example
 * ```tsx
 * import { useEthereumWallet } from '@openfort/react/ethereum';
 *
 * function MyComponent() {
 *   const ethereum = useEthereumWallet();
 *
 *   if (ethereum.status === 'connected') {
 *     console.log('Address:', ethereum.activeWallet.address);
 *   }
 * }
 * ```
 *
 * @packageDocumentation
 */

// =============================================================================
// Context (Optional)
// =============================================================================

export {
  EthereumContextProvider,
  type EthereumContextProviderProps,
  type EthereumContextValue,
  useEthereumContext,
  useEthereumContextSafe,
} from './EthereumContext'

// =============================================================================
// Hooks
// =============================================================================

export { useEthereumWallet } from './hooks/useEthereumWallet'

// =============================================================================
// Types
// =============================================================================

export type {
  ConnectedEmbeddedEthereumWallet,
  CreateEthereumWalletOptions,
  CreateEthereumWalletResult,
  EIP1193EventHandler,
  EIP1193EventName,
  EIP1193RequestArguments,
  EmbeddedEthereumWalletState,
  EthereumWalletActions,
  OpenfortEmbeddedEthereumWalletProvider,
  SetActiveEthereumWalletOptions,
  SetRecoveryOptions,
  UseEmbeddedEthereumWalletOptions,
} from './types'

// =============================================================================
// Operations (pure functions for signing/transactions)
// =============================================================================

export {
  getEthereumProvider,
  type SendTransactionParams,
  type SignMessageParams,
  type SignTypedDataParams,
  sendTransaction,
  signMessage,
  signTypedData,
} from './operations'

// =============================================================================
// Utils
// =============================================================================

export { ethToWei, GWEI_PER_ETH, WEI_PER_ETH, weiToEth } from './hooks/utils'
