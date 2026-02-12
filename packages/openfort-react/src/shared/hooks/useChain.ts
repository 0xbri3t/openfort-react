import { ChainTypeEnum } from '@openfort/openfort-js'
import { useOpenfort } from '../../components/Openfort/useOpenfort'

const CHAIN_NAMES: Record<ChainTypeEnum, string> = {
  [ChainTypeEnum.EVM]: 'Ethereum',
  [ChainTypeEnum.SVM]: 'Solana',
}

/**
 * Returns the current chain type (EVM or Solana) and derived flags.
 * Used to branch logic or UI based on which chain the provider is configured for.
 *
 * @returns chainType, isEvm, isSolana, and display name
 *
 * @example
 * ```tsx
 * const { isEvm, chainType } = useChain()
 * if (isEvm) return <EthereumBalance />
 * return <SolanaBalance />
 * ```
 */
export function useChain(): {
  chainType: ChainTypeEnum
  isEvm: boolean
  isSolana: boolean
  name: string
} {
  const chainType = useOpenfort().chainType
  return {
    chainType,
    isEvm: chainType === ChainTypeEnum.EVM,
    isSolana: chainType === ChainTypeEnum.SVM,
    name: CHAIN_NAMES[chainType] ?? chainType,
  }
}
