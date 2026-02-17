import React from 'react'
import type { WalletFlowStatus } from '../hooks/openfort/walletTypes'
import { Context } from './context'

/**
 * Access Openfort core context: user, embedded accounts, active chain, auth, and wallet operations.
 * Must be used inside CoreOpenfortProvider (or OpenfortProvider which wraps it).
 *
 * @returns Core context with user, embeddedAccounts, activeChainId, setActiveChainId, logout, etc.
 * @throws Error if used outside CoreOpenfortProvider
 */
export const useOpenfortCore = () => {
  const context = React.useContext(Context)
  if (!context) throw Error('useOpenfortContext Hook must be inside CoreOpenfortProvider.')
  return context
}

export const useWalletStatus = (): [WalletFlowStatus, (status: WalletFlowStatus) => void] => {
  const context = React.useContext(Context)
  if (!context) throw Error('useWalletStatus Hook must be inside CoreOpenfortProvider.')
  return [context.walletStatus, context.setWalletStatus]
}
