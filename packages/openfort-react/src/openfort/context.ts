import { createContext } from 'react'
import type { OpenfortCoreContextValue } from './CoreOpenfortProvider'

export const Context = createContext<OpenfortCoreContextValue | null>(null)
