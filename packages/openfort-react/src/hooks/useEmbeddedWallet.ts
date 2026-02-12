import { ChainTypeEnum } from '@openfort/openfort-js'
import { useEthereumEmbeddedWallet } from '../ethereum/hooks/useEthereumEmbeddedWallet'
import type { EmbeddedEthereumWalletState } from '../ethereum/types'
import { useChain } from '../shared/hooks/useChain'
import { useSolanaEmbeddedWallet } from '../solana/hooks/useSolanaEmbeddedWallet'
import type { EmbeddedSolanaWalletState } from '../solana/types'

export type EmbeddedWalletState =
  | (EmbeddedEthereumWalletState & { chainType: typeof ChainTypeEnum.EVM })
  | (EmbeddedSolanaWalletState & { chainType: typeof ChainTypeEnum.SVM })

/**
 * Returns embedded wallet state for the current chain type (EVM or Solana).
 * Combines useEthereumEmbeddedWallet or useSolanaEmbeddedWallet based on chainType.
 *
 * @returns State with status, wallets, activeWallet, create, recover, setActive, and provider
 *
 * @example
 * ```tsx
 * const embedded = useEmbeddedWallet()
 * if (embedded.status === 'connected') {
 *   console.log(embedded.activeWallet?.address)
 * }
 * ```
 */
export function useEmbeddedWallet(): EmbeddedWalletState {
  const { chainType } = useChain()
  const ethereum = useEthereumEmbeddedWallet()
  const solana = useSolanaEmbeddedWallet()

  if (chainType === ChainTypeEnum.EVM) {
    return { ...ethereum, chainType: ChainTypeEnum.EVM }
  }
  return { ...solana, chainType: ChainTypeEnum.SVM }
}
