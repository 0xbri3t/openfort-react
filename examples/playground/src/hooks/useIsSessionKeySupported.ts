import { AccountTypeEnum, useEthereumEmbeddedWallet } from '@openfort/react'

/**
 * Session keys are only supported for Smart Accounts.

 * EOA (Externally Owned Accounts) and external wallets (MetaMask, etc.) cannot use session keys.
 */
export function useIsSessionKeySupported(): boolean {
  const ethereum = useEthereumEmbeddedWallet()

  if (ethereum.walletType === 'external') return false
  if (ethereum.status !== 'connected' || !ethereum.activeWallet) return false

  const accountType = ethereum.activeWallet.accountType
  return accountType === AccountTypeEnum.SMART_ACCOUNT || accountType === AccountTypeEnum.DELEGATED_ACCOUNT
}
