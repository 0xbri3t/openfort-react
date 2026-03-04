'use client'

import { createContext } from 'react'
import type { OpenfortCoreContextValue } from './CoreOpenfortProvider'

const CONTEXT_KEY = '__openfort_core_context_v1__'
const g = globalThis as Record<string, unknown>

if (!g[CONTEXT_KEY]) {
  g[CONTEXT_KEY] = createContext<OpenfortCoreContextValue | null>(null)
}

export const Context = g[CONTEXT_KEY] as ReturnType<typeof createContext<OpenfortCoreContextValue | null>>
