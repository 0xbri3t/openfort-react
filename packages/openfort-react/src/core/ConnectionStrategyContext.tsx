import { createContext, type ReactNode, useContext } from 'react'
import type { ConnectionStrategy } from './ConnectionStrategy'

const ConnectionStrategyContext = createContext<ConnectionStrategy | null>(null)

export function ConnectionStrategyProvider({
  strategy,
  children,
}: {
  strategy: ConnectionStrategy | null
  children?: ReactNode
}) {
  return <ConnectionStrategyContext.Provider value={strategy}>{children}</ConnectionStrategyContext.Provider>
}

export function useConnectionStrategy(): ConnectionStrategy | null {
  return useContext(ConnectionStrategyContext)
}
