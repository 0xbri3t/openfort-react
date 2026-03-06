'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { DEFAULT_DEV_CHAIN_ID } from '../core/ConnectionStrategy'

const STORAGE_KEY = 'openfort_active_chain_id'

/**
 * Persists the user-selected EVM chain id in localStorage.
 * Used by the embedded strategy (no wagmi) to track which chain is active.
 */
export function usePersistedChainId() {
  const [activeChainId, setActiveChainIdState] = useState<number | undefined>(undefined)
  const activeChainIdRef = useRef<number | undefined>(undefined)
  activeChainIdRef.current = activeChainId

  useEffect(() => {
    if (typeof window === 'undefined') return
    const s = window.localStorage.getItem(STORAGE_KEY)
    if (s == null) return
    const n = parseInt(s, 10)
    if (Number.isNaN(n)) return
    if (n === DEFAULT_DEV_CHAIN_ID) {
      window.localStorage.removeItem(STORAGE_KEY)
      return
    }
    setActiveChainIdState(n)
  }, [])

  const setActiveChainId = useCallback((chainId: number | undefined) => {
    setActiveChainIdState(chainId)
    if (typeof window !== 'undefined') {
      if (chainId == null) window.localStorage.removeItem(STORAGE_KEY)
      else window.localStorage.setItem(STORAGE_KEY, String(chainId))
    }
  }, [])

  return { activeChainId, activeChainIdRef, setActiveChainId }
}
