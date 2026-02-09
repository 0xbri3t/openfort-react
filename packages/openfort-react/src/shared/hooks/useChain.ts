import { ChainTypeEnum } from '@openfort/openfort-js'
import { useOpenfort } from '../../components/Openfort/useOpenfort'

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
    name: chainType === ChainTypeEnum.EVM ? 'Ethereum' : 'Solana',
  }
}
