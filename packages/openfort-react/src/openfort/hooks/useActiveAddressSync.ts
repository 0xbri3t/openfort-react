'use client'

import { type ChainTypeEnum, EmbeddedState, type Openfort } from '@openfort/openfort-js'
import { useEffect } from 'react'
import type { StoreApi } from 'zustand/vanilla'
import { firstEmbeddedAddress } from '../../core/strategyUtils'
import type { OpenfortStore } from '../store'

type Params = {
  openfort: Openfort
  storeEmbeddedAccounts: OpenfortStore['embeddedAccounts']
  storeEmbeddedState: OpenfortStore['embeddedState']
  storeActiveEmbeddedAddress: OpenfortStore['activeEmbeddedAddress']
  chainType: ChainTypeEnum
  store: StoreApi<OpenfortStore>
}

/**
 * Syncs the active embedded address into the store.
 *
 * - Clears address when there are no accounts or user is logged out.
 * - When READY: asks the SDK for its active wallet, falls back to the first
 *   account for the current chain.
 */
export function useActiveAddressSync({
  openfort,
  storeEmbeddedAccounts,
  storeEmbeddedState,
  storeActiveEmbeddedAddress,
  chainType,
  store,
}: Params): void {
  useEffect(() => {
    if (!openfort || !storeEmbeddedAccounts?.length) {
      if (!storeEmbeddedAccounts?.length) {
        store.getState().setActiveEmbeddedAddress(undefined)
      }
      return
    }

    // Terminal non-READY states: clear only on genuine logout (no user).
    // During OAuth the state passes through UNAUTHENTICATED → EMBEDDED_SIGNER_NOT_CONFIGURED → READY
    // while accounts and address are already set. Clearing here would undo that.
    if (storeEmbeddedState === EmbeddedState.UNAUTHENTICATED || storeEmbeddedState === EmbeddedState.NONE) {
      if (!store.getState().user) {
        store.getState().setActiveEmbeddedAddress(undefined)
      }
      return
    }

    // Bootstrap recovery: when signer is not yet configured and no address is set,
    // seed the active address so useAutoRecovery can trigger and drive state → READY.
    if (storeEmbeddedState === EmbeddedState.EMBEDDED_SIGNER_NOT_CONFIGURED) {
      if (storeActiveEmbeddedAddress === undefined) {
        const first = firstEmbeddedAddress(storeEmbeddedAccounts, chainType)
        if (first) store.getState().setActiveEmbeddedAddress(first)
      }
      return
    }

    if (storeEmbeddedState !== EmbeddedState.READY) {
      return
    }

    // Already have an address — nothing to resolve
    if (storeActiveEmbeddedAddress !== undefined) return

    // Priority 1: ask the SDK for its active wallet
    let cancelled = false
    openfort.embeddedWallet
      .get()
      .then((active) => {
        if (cancelled) return
        const addr = active?.address
        if (addr) {
          store.getState().setActiveEmbeddedAddress(addr)
          return
        }
        // Priority 2: fallback to first account for current chain
        const first = firstEmbeddedAddress(storeEmbeddedAccounts, chainType)
        if (first) store.getState().setActiveEmbeddedAddress(first)
      })
      .catch((_err) => {
        if (cancelled) return
        const first = firstEmbeddedAddress(storeEmbeddedAccounts, chainType)
        if (first) store.getState().setActiveEmbeddedAddress(first)
      })
    return () => {
      cancelled = true
    }
  }, [openfort, storeEmbeddedAccounts, storeEmbeddedState, storeActiveEmbeddedAddress, chainType, store])
}
