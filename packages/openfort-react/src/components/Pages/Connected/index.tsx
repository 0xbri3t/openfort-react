/**
 * Connected Page Router
 *
 * Routes to the appropriate connected page based on provider chain type.
 */

import { ChainTypeEnum } from '@openfort/openfort-js'
import type React from 'react'
import { useChain } from '../../../shared/hooks/useChain'
import EthereumConnected from './EthereumConnected'
import SolanaConnected from './SolanaConnected'

export const Connected: React.FC = () => {
  const { chainType } = useChain()

  switch (chainType) {
    case ChainTypeEnum.EVM:
      return <EthereumConnected />
    case ChainTypeEnum.SVM:
      return <SolanaConnected />
    default:
      return null
  }
}
