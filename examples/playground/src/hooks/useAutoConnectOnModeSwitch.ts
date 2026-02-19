/**
 * Auto-connects to the embedded wallet of the target chain when playground mode switches.
 * If a wallet exists (AUTOMATIC or PASSKEY recovery), sets it active. If none exists, creates one.
 * Skips PASSWORD-recovery wallets (user must go through the modal).
 *
 * Waits for embedded accounts to load before running (avoids creating when wallets exist but
 * query was still pending after chain type switch).
 */

import {
  ChainTypeEnum,
  RecoveryMethod,
  useEthereumEmbeddedWallet,
  useOpenfort,
  useSolanaEmbeddedWallet,
  useUser,
} from '@openfort/react'
import { useEffect, useRef } from 'react'
import type { OpenfortPlaygroundMode } from '@/providers'

export function useAutoConnectOnModeSwitch(mode: OpenfortPlaygroundMode) {
  const { user } = useUser()
  const { embeddedAccounts, isLoadingAccounts } = useOpenfort()
  const ethereumWallet = useEthereumEmbeddedWallet()
  const solanaWallet = useSolanaEmbeddedWallet()
  const prevModeRef = useRef<OpenfortPlaygroundMode | null>(null)
  const hasRunForModeRef = useRef<OpenfortPlaygroundMode | null>(null)

  useEffect(() => {
    if (!user) return

    const prevMode = prevModeRef.current

    // Skip only when already in sync (prevMode === mode). On initial mount (prevMode === null)
    // we DO want to run to connect to the current mode's wallet.
    if (prevMode === mode) return

    // Wait for accounts to load before deciding setActive vs create
    if (isLoadingAccounts) return

    // Avoid running twice for the same mode switch
    if (hasRunForModeRef.current === mode) return
    hasRunForModeRef.current = mode
    prevModeRef.current = mode

    const targetChain = mode === 'solana-only' ? ChainTypeEnum.SVM : ChainTypeEnum.EVM
    const wallet = targetChain === ChainTypeEnum.SVM ? solanaWallet : ethereumWallet

    if (wallet.status === 'connected') return
    if (wallet.status === 'connecting' || wallet.status === 'creating') return

    // Use embeddedAccounts filtered by chain - wallet.wallets may be stale during query transition
    const chainAccounts = (embeddedAccounts ?? []).filter((a) => a.chainType === targetChain)

    if (chainAccounts.length > 0) {
      const first = chainAccounts[0]
      const canAutoRecover =
        first.recoveryMethod === RecoveryMethod.AUTOMATIC || first.recoveryMethod === RecoveryMethod.PASSKEY

      if (canAutoRecover) {
        if (targetChain === ChainTypeEnum.SVM) {
          void solanaWallet.setActive({ address: first.address })
        } else {
          void ethereumWallet.setActive({ address: first.address as `0x${string}` })
        }
      }
    } else {
      // void wallet.create() // disabled to avoid creating too many wallets
    }
  }, [mode, user, isLoadingAccounts, embeddedAccounts, ethereumWallet, solanaWallet])
}
