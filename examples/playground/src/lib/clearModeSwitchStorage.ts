const STORAGE_KEYS = ['openfort_active_chain_id', 'openfort:solana:cluster', 'openfort.playground.sessionkeys'] as const

export function clearModeSwitchStorage(): void {
  if (typeof window === 'undefined') return
  STORAGE_KEYS.forEach((key) => {
    try {
      localStorage.removeItem(key)
    } catch {}
  })
}
