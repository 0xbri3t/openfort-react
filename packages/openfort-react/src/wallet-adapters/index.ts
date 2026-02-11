/**
 * Wallet adapters: interfaces and EVM/Solana implementations
 *
 * Use adapter types for app code that can run with either wagmi or SDK-only.
 * Use EVM hooks when in evm-only mode; use Solana hooks when in solana-only mode.
 */

export {
  useEVMAccount,
  useEVMBalance,
  useEVMDisconnect,
  useEVMReadContract,
  useEVMSignMessage,
  useEVMSwitchChain,
  useEVMWriteContract,
} from './evm'
export {
  useSVMAccount,
  useSVMBalance,
  useSVMDisconnect,
  useSVMSignMessage,
  useSVMWriteContract,
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
