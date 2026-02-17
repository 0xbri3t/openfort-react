/**
 * Wallet adapters: interfaces and EVM/Solana implementations
 *
 * Use adapter types for app code that can run with either wagmi or SDK-only.
 * Use EVM hooks when in evm-only mode; use Solana hooks when in solana-only mode.
 */

export { useSolanaBalance } from '../solana/hooks/useSolanaBalance'
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
  useSolanaDisconnect,
  useSolanaSignMessage,
  useSolanaWriteContract,
} from './solana'
