/**
 * Solana Context Provider
 *
 * Provides Solana configuration (cluster, RPC URL, commitment) to descendant components.
 * Cluster selection is stateful and persisted to localStorage (openfort:solana:cluster).
 */

import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from 'react'
import type { SolanaCluster, SolanaClusterConfig, SolanaCommitment, SolanaConfig } from '../types'

const STORAGE_KEY = 'openfort:solana:cluster'

/**
 * Solana context value with resolved configuration
 */
export interface SolanaContextValue {
  /** Active Solana cluster */
  cluster: SolanaCluster
  /** RPC URL (resolved from config, custom cluster, or default) */
  rpcUrl: string
  /** Transaction commitment level */
  commitment: SolanaCommitment
  /** Custom cluster list from config (if any) */
  customClusters: SolanaClusterConfig[] | undefined
  /** Set active cluster (and optional rpcUrl for custom); persists to localStorage */
  setCluster: (cluster: SolanaCluster, rpcUrl?: string) => void
}

const DEFAULT_RPC_URLS: Partial<Record<Exclude<SolanaCluster, 'custom'>, string>> = {
  devnet: 'https://api.devnet.solana.com',
  testnet: 'https://api.testnet.solana.com',
}

function getDefaultRpcUrl(cluster: SolanaCluster): string {
  if (cluster === 'custom') return DEFAULT_RPC_URLS.devnet!
  return DEFAULT_RPC_URLS[cluster] ?? DEFAULT_RPC_URLS.devnet!
}

export interface SolanaContextProviderProps {
  /** Solana configuration from OpenfortWalletConfig */
  config: SolanaConfig
  /** Child components */
  children: ReactNode
}

export const SolanaContext = createContext<SolanaContextValue | null>(null)

/**
 * Provides Solana configuration context to descendant components.
 *
 * This provider is automatically rendered by OpenfortProvider when
 * `walletConfig.solana` is configured.
 *
 * @example
 * ```tsx
 * // Usually you don't use this directly, configure via OpenfortProvider:
 * <OpenfortProvider
 *   publishableKey="pk_..."
 *   walletConfig={{
 *     shieldPublishableKey: 'shield_pk_...',
 *     solana: {
 *       cluster: 'mainnet-beta',
 *       commitment: 'confirmed'
 *     }
 *   }}
 * >
 *   <App />
 * </OpenfortProvider>
 * ```
 */
const DEFAULT_CLUSTERS: SolanaCluster[] = ['devnet', 'testnet']

type StoredCluster = { cluster: SolanaCluster; rpcUrl?: string } | null

function readStoredCluster(): StoredCluster {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    // Dev/test environment: only allow devnet, testnet, custom — never mainnet-beta
    if (raw === 'mainnet-beta') return null
    if (DEFAULT_CLUSTERS.includes(raw as SolanaCluster)) return { cluster: raw as SolanaCluster }
    if (raw === 'custom') return { cluster: 'custom' }
    const parsed = JSON.parse(raw) as { cluster?: string; rpcUrl?: string }
    if (parsed?.cluster === 'mainnet-beta') return null
    if (parsed?.cluster === 'custom' && typeof parsed?.rpcUrl === 'string')
      return { cluster: 'custom', rpcUrl: parsed.rpcUrl }
    return null
  } catch {
    return null
  }
}

function writeStoredCluster(cluster: SolanaCluster, rpcUrl?: string) {
  if (typeof window === 'undefined') return
  try {
    if (DEFAULT_CLUSTERS.includes(cluster)) {
      localStorage.setItem(STORAGE_KEY, cluster)
    } else if (cluster === 'custom' && rpcUrl) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ cluster: 'custom', rpcUrl }))
    } else {
      localStorage.setItem(STORAGE_KEY, cluster)
    }
  } catch {
    // ignore
  }
}

function resolveRpcUrl(cluster: SolanaCluster, rpcUrlOverride: string | undefined, config: SolanaConfig): string {
  if (rpcUrlOverride !== undefined) return rpcUrlOverride
  const customMatch = config.customClusters?.find((c) => c.cluster === cluster)
  if (customMatch) return customMatch.rpcUrl
  if (config.rpcUrl !== undefined && cluster === config.cluster) return config.rpcUrl
  return getDefaultRpcUrl(cluster)
}

const DEFAULT_CLUSTER: SolanaCluster = 'devnet'

export function SolanaContextProvider({ config, children }: SolanaContextProviderProps) {
  const [cluster, setClusterState] = useState<SolanaCluster>(() => {
    const s = readStoredCluster()
    const fromStored = s?.cluster
    const fromConfig = config.cluster
    // Dev/test environment: never use mainnet-beta as default
    if (fromStored === 'mainnet-beta' || fromConfig === 'mainnet-beta') return DEFAULT_CLUSTER
    return fromStored ?? fromConfig
  })
  const [rpcUrlOverride, setRpcUrlOverride] = useState<string | undefined>(() => readStoredCluster()?.rpcUrl)

  const rpcUrl = useMemo(() => resolveRpcUrl(cluster, rpcUrlOverride, config), [cluster, rpcUrlOverride, config])

  const setCluster = useCallback((newCluster: SolanaCluster, customRpcUrl?: string) => {
    setClusterState(newCluster)
    setRpcUrlOverride(customRpcUrl)
    writeStoredCluster(newCluster, customRpcUrl)
  }, [])

  const value = useMemo<SolanaContextValue>(
    () => ({
      cluster,
      rpcUrl,
      commitment: config.commitment ?? 'confirmed',
      customClusters: config.customClusters,
      setCluster,
    }),
    [cluster, rpcUrl, config.commitment, config.customClusters, setCluster]
  )

  return <SolanaContext.Provider value={value}>{children}</SolanaContext.Provider>
}

/**
 * Access the Solana context configuration.
 *
 * @throws Error if called outside of a SolanaContextProvider
 * (i.e., when `walletConfig.solana` is not configured in OpenfortProvider)
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { cluster, rpcUrl, commitment } = useSolanaContext();
 *   // Use Solana configuration...
 * }
 * ```
 */
export function useSolanaContext(): SolanaContextValue {
  const context = useContext(SolanaContext)
  if (!context) {
    throw new Error(
      'useSolanaContext must be used within a SolanaContextProvider. ' +
        'Make sure walletConfig.solana is configured in OpenfortProvider.'
    )
  }
  return context
}
