import { ChainTypeEnum, EmbeddedState, type Openfort } from '@openfort/openfort-js'
import type { OpenfortWalletConfig } from '../../components/Openfort/types'
import type { ConnectionStrategy, ConnectionStrategyState } from '../ConnectionStrategy'
import { firstEmbeddedAddress } from '../strategyUtils'

function hasEmbeddedSolana(state: ConnectionStrategyState): boolean {
  if (!state.user || !state.activeEmbeddedAddress || state.embeddedState !== EmbeddedState.READY) return false
  return (
    state.embeddedAccounts?.some(
      (a) => a.chainType === ChainTypeEnum.SVM && a.address === state.activeEmbeddedAddress
    ) ?? false
  )
}

export function createSolanaEmbeddedStrategy(
  walletConfig: OpenfortWalletConfig | undefined
): ConnectionStrategy | null {
  if (!walletConfig?.solana) return null

  return {
    kind: 'embedded',
    chainType: ChainTypeEnum.SVM,

    isConnected(state) {
      return hasEmbeddedSolana(state)
    },

    getChainId() {
      return undefined
    },

    getAddress(state) {
      if (state.activeEmbeddedAddress) {
        const svm = state.embeddedAccounts?.find(
          (a) => a.chainType === ChainTypeEnum.SVM && a.address === state.activeEmbeddedAddress
        )
        if (svm) return svm.address
      }
      return firstEmbeddedAddress(state.embeddedAccounts, ChainTypeEnum.SVM)
    },

    getConnectRoutes() {
      return ['embedded']
    },

    getConnectors() {
      return []
    },

    async initProvider(): Promise<void> {
      return
    },

    async disconnect(openfort: Openfort) {
      await openfort.auth.logout()
    },
  }
}
