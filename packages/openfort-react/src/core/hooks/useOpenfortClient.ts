/**
 * Hook to access the Openfort SDK client
 *
 * Provides type-safe access to the underlying Openfort client instance.
 */

import type { Openfort } from '@openfort/openfort-js'

import { useCoreContext } from '../CoreContext'
import type { OpenfortConfig } from '../types'

/**
 * Return type for useOpenfortClient hook
 */
export type UseOpenfortClientReturn = {
  /** Openfort SDK client instance */
  client: Openfort
  /** Current configuration */
  config: OpenfortConfig
  /** Whether debug mode is enabled */
  debug: boolean
}

/**
 * Access the Openfort SDK client
 *
 * This hook provides direct access to the Openfort client for advanced use cases.
 * For most operations, prefer the higher-level hooks like useUser, useEthereumEmbeddedWallet, etc.
 *
 * @returns Openfort client and configuration
 * @throws ProviderNotFoundError if not within OpenfortProvider
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { client } = useOpenfortClient()
 *
 *   const handleAdvancedOperation = async () => {
 *     // Direct SDK access for advanced use cases
 *     const session = await client.getSession()
 *   }
 * }
 * ```
 */
export function useOpenfortClient(): UseOpenfortClientReturn {
  const { client, config, debug } = useCoreContext()

  return {
    client,
    config,
    debug,
  }
}
