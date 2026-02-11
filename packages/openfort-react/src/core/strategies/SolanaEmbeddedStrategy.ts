import { ChainTypeEnum, type EmbeddedAccount, EmbeddedState, type Openfort } from '@openfort/openfort-js'
import type { OpenfortWalletConfig } from '../../components/Openfort/types'
import type { ConnectionStrategy, ConnectionStrategyState } from '../ConnectionStrategy'

function firstSolanaAddress(accounts: EmbeddedAccount[] | undefined): string | undefined {
  if (!accounts?.length) return undefined
  const svm = accounts.find((a) => a.chainType === ChainTypeEnum.SVM)
  return svm?.address
}

function hasEmbeddedSolana(state: ConnectionStrategyState): boolean {
  if (!state.user) return false
  const svmAddress = firstSolanaAddress(state.embeddedAccounts)
  if (!svmAddress) return false
  if (!state.activeEmbeddedAddress) return false
  if (state.embeddedState !== EmbeddedState.READY) return false
  return (
    state.embeddedAccounts?.some(
      (a) => a.chainType === ChainTypeEnum.SVM && a.address.toLowerCase() === state.activeEmbeddedAddress?.toLowerCase()
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
      return firstSolanaAddress(state.embeddedAccounts)
    },

    getConnectRoutes() {
      return ['embedded']
    },

    getConnectors() {
      return []
    },

    async initProvider(_openfort: Openfort, _config: OpenfortWalletConfig) {
      return
    },

    async disconnect(openfort: Openfort) {
      await openfort.auth.logout()
    },
  }
}
