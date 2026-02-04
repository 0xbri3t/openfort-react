/**
 * Ethereum-specific exports for @openfort/react/ethereum
 *
 * Import from '@openfort/react/ethereum' for Ethereum-only features.
 *
 * @example
 * ```tsx
 * import { useEthereumEmbeddedWallet } from '@openfort/react/ethereum';
 *
 * function MyComponent() {
 *   const ethereum = useEthereumEmbeddedWallet();
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
// Hooks
// =============================================================================

export { useEthereumEmbeddedWallet } from './hooks/useEthereumEmbeddedWallet'
