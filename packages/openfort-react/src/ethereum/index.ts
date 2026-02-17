/**
 * Ethereum-specific exports for @openfort/react/ethereum
 *
 * Import from '@openfort/react/ethereum' for Ethereum-only features.
 *
 * @packageDocumentation
 */

export type { SetRecoveryOptions } from '../shared/types'
export {
  EthereumContext,
  EthereumContextProvider,
  type EthereumContextProviderProps,
  type EthereumContextValue,
  useEthereumContext,
} from './EthereumContext'
export { useEthereumEmbeddedWallet } from './hooks/useEthereumEmbeddedWallet'
export {
  type EthereumGasEstimate,
  type UseEthereumGasEstimateOptions,
  useEthereumGasEstimate,
} from './hooks/useEthereumGasEstimate'
export {
  type EthereumSendTransactionParams,
  type UseEthereumSendTransactionReturn,
  useEthereumSendTransaction,
} from './hooks/useEthereumSendTransaction'
export {
  type EthereumTokenBalanceState,
  type UseEthereumTokenBalanceOptions,
  useEthereumTokenBalance,
} from './hooks/useEthereumTokenBalance'
export {
  type EthereumWaitForTransactionReceiptState,
  type UseEthereumWaitForTransactionReceiptOptions,
  useEthereumWaitForTransactionReceipt,
} from './hooks/useEthereumWaitForTransactionReceipt'
export {
  type EthereumWriteContractParams,
  type UseEthereumWriteContractReturn,
  useEthereumWriteContract,
} from './hooks/useEthereumWriteContract'
export { type SignMessageParams, signMessage } from './operations'
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
  UseEmbeddedEthereumWalletOptions,
} from './types'
