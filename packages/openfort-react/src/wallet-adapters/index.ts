/**
 * Wallet adapters: interfaces and EVM implementation
 *
 * Use adapter types for app code that can run with either wagmi or SDK-only.
 * Use EVM hooks when in evm-only mode (no WagmiProvider).
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
export type {
  UseAccountLike,
  UseBalanceLike,
  UseDisconnectLike,
  UseReadContractLike,
  UseSignMessageLike,
  UseSwitchChainLike,
  UseWriteContractLike,
  WalletAdapterChain,
} from './types'
