import { ChainTypeEnum } from '@openfort/openfort-js'
import type React from 'react'
import { useChain } from '../../../shared/hooks/useChain'
import EthereumConnected from './EthereumConnected'
import SolanaConnected from './SolanaConnected'

const CONNECTED_REGISTRY: Partial<Record<ChainTypeEnum, React.FC>> = {
  [ChainTypeEnum.EVM]: EthereumConnected,
  [ChainTypeEnum.SVM]: SolanaConnected,
}

export const Connected: React.FC = () => {
  const { chainType } = useChain()
  const Component = CONNECTED_REGISTRY[chainType]
  return Component ? <Component /> : null
}
