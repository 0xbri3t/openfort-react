/**
 * Wallet adapters: interfaces and EVM/Solana implementations
 *
 * Use adapter types for app code that can run with either wagmi or SDK-only.
 * Use EVM hooks when in evm-only mode; use Solana hooks when in solana-only mode.
 */

export {
  useEthereumAccount,
  useEthereumBalance,
  useEthereumDisconnect,
  useEthereumReadContract,
  useEthereumSignMessage,
  useEthereumSwitchChain,
  useEthereumWriteContract,
} from './ethereum'
export {
  useSolanaAccount,
  useSolanaBalanceAdapter,
  useSolanaDisconnect,
  useSolanaSignMessage,
  useSolanaWriteContract,
} from './solana'
export type {
  SolanaCluster,
  UseAccountLike,
  UseBalanceLike,
  UseDisconnectLike,
  UseReadContractLike,
  UseSignMessageLike,
  UseSolanaAccountLike,
  UseSolanaSendSOLLike,
  UseSolanaSignMessageLike,
  UseSwitchChainLike,
  UseWriteContractLike,
  WalletAdapterChain,
} from './types'
