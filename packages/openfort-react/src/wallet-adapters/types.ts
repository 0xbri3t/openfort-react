/**
 * Wallet adapter interfaces
 *
 * These types describe the hook return shapes that UI components expect.
 * Implementations can be: EVM (SDK/viem), Solana (SDK), or Wagmi (wagmi hooks).
 * Use the implementation that matches your setup (evm-only, wagmi, solana).
 */

/** Chain info for switch chain / display */
export interface WalletAdapterChain {
  id: number
  name: string
  blockExplorers?: { default: { url: string } }
}

/** useAccount-like: connected address and chain */
export interface UseAccountLike {
  address: `0x${string}` | undefined
  chainId: number | undefined
  isConnected: boolean
}

/** useBalance-like: native balance for connected account */
export interface UseBalanceLike {
  data?: { value: bigint; formatted: string; symbol: string; decimals: number }
  refetch: () => void
  isLoading?: boolean
  error?: Error | null
}

/** useDisconnect-like */
export interface UseDisconnectLike {
  disconnect: () => void | Promise<void>
}

/** useSwitchChain-like */
export interface UseSwitchChainLike {
  chains: WalletAdapterChain[]
  /** Current chain ID (use instead of useChainId() when using adapter) */
  currentChainId: number | undefined
  switchChain: (params: { chainId: number }) => void | Promise<void>
  data?: WalletAdapterChain
  error: Error | null
  isPending: boolean
}

/** useSignMessage-like */
export interface UseSignMessageLike {
  data: `0x${string}` | undefined
  signMessage: (params: { message: string }) => void | Promise<void>
  isPending?: boolean
  error?: Error | null
}

/** useReadContract-like (simplified: one contract read) */
export interface UseReadContractLike {
  data: unknown
  refetch: () => void
  error: Error | null
  isLoading?: boolean
}

/** useWriteContract-like */
export interface UseWriteContractLike {
  data: `0x${string}` | undefined
  writeContract: (params: {
    address: `0x${string}`
    abi: unknown[]
    functionName: string
    args?: unknown[]
  }) => void | Promise<void> | Promise<`0x${string}`>
  isPending: boolean
  error: Error | null
}

export type SolanaCluster = 'mainnet-beta' | 'devnet' | 'testnet' | 'custom'

export interface UseSolanaAccountLike {
  address: string | undefined
  cluster: SolanaCluster | undefined
  isConnected: boolean
}

export interface UseSolanaSignMessageLike {
  data: string | undefined
  signMessage: (params: { message: string }) => Promise<void>
  isPending: boolean
  error: Error | null
}

export interface UseSolanaSendSOLLike {
  sendSOL: (params: { to: string; lamports: bigint }) => Promise<void>
  data: string | undefined
  isPending: boolean
  error: Error | null
  reset: () => void
}
