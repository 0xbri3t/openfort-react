import { ChainTypeEnum } from '@openfort/openfort-js'
import { useEthereumEmbeddedWallet } from '../ethereum/hooks/useEthereumEmbeddedWallet'
import type { EmbeddedEthereumWalletState } from '../ethereum/types'
import { useChain } from '../shared/hooks/useChain'
import { useSolanaEmbeddedWallet } from '../solana/hooks/useSolanaEmbeddedWallet'
import type { EmbeddedSolanaWalletState } from '../solana/types'

export type EmbeddedWalletState =
  | (EmbeddedEthereumWalletState & { chainType: typeof ChainTypeEnum.EVM })
  | (EmbeddedSolanaWalletState & { chainType: typeof ChainTypeEnum.SVM })

export function useEmbeddedWallet(): EmbeddedWalletState {
  const { chainType } = useChain()
  const ethereum = useEthereumEmbeddedWallet()
  const solana = useSolanaEmbeddedWallet()

  if (chainType === ChainTypeEnum.EVM) {
    return { ...ethereum, chainType: ChainTypeEnum.EVM }
  }
  return { ...solana, chainType: ChainTypeEnum.SVM }
}
