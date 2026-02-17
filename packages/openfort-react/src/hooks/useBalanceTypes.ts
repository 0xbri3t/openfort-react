/**
 * Wallet adapter type interfaces
 * Used internally by balance and other hooks
 */

export interface UseBalanceLike {
  data?: {
    value: bigint
    formatted: string
    symbol: string
    decimals: number
  }
  refetch: () => void
  isLoading: boolean
  error?: Error | null
}
