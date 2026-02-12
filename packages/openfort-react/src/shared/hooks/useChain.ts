import { ChainTypeEnum } from '@openfort/openfort-js'
import { useOpenfort } from '../../components/Openfort/useOpenfort'

const CHAIN_NAMES: Record<ChainTypeEnum, string> = {
  [ChainTypeEnum.EVM]: 'Ethereum',
  [ChainTypeEnum.SVM]: 'Solana',
}

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
