/**
 * Ethereum-specific exports for @openfort/react/ethereum
 *
 * Import from '@openfort/react/ethereum' for Ethereum-only features.
 *
 * @packageDocumentation
 */

export { useEthereumEmbeddedWallet } from './hooks/useEthereumEmbeddedWallet'
export { useEthereumWalletAssets } from './hooks/useEthereumWalletAssets'
export type {
  ConnectedEmbeddedEthereumWallet,
  CreateEthereumWalletOptions,
  CreateEthereumWalletResult,
  EIP1193EventHandler,
  EIP1193EventName,
  EIP1193RequestArguments,
  EthereumWalletActions,
  EthereumWalletConfig,
  EthereumWalletState,
  OpenfortEmbeddedEthereumWalletProvider,
  PolicyConfig,
  SetActiveEthereumWalletOptions,
  UseEmbeddedEthereumWalletOptions,
} from './types'
