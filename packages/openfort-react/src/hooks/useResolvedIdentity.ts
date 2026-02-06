/**
 * useResolvedIdentity Hook
 *
 * Resolve ENS names and avatars using viem.
 * Uses discriminated union for type-safe status handling.
 */

import { useQuery } from '@tanstack/react-query'
import { createPublicClient, http } from 'viem'
import { mainnet } from 'viem/chains'
import { normalize } from 'viem/ens'

import { useCoreContext } from '../core/CoreContext'
import type { ChainType } from '../utils/chains'
import { getDefaultEthereumRpcUrl } from '../utils/rpc'

/**
 * Resolved identity state - discriminated union
 */
export type ResolvedIdentity =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; error: Error }
  | { status: 'success'; name: string | null; avatar: string | null }

export interface UseResolvedIdentityOptions {
  /** Address to resolve (empty string if not available yet) */
  address: string
  /** Chain type for resolution */
  chainType?: ChainType
  /** ENS chain ID (default: 1 for mainnet) */
  ensChainId?: number
  /** Enable/disable the query (for conditional fetching without breaking React rules) */
  enabled?: boolean
}

type IdentityResolver = (address: string, rpcUrl: string) => Promise<{ name: string | null; avatar: string | null }>

const resolvers: Record<ChainType, IdentityResolver> = {
  ethereum: async (address, rpcUrl) => {
    const client = createPublicClient({
      chain: mainnet,
      transport: http(rpcUrl),
    })

    // IMPORTANT: getEnsAvatar requires ENS name, not address
    // Must fetch name first, then avatar
    const name = await client
      .getEnsName({
        address: address as `0x${string}`,
      })
      .catch(() => null)

    // Only fetch avatar if we have a name
    const avatar = name ? await client.getEnsAvatar({ name: normalize(name) }).catch(() => null) : null

    return { name, avatar }
  },

  solana: async (_address, _rpcUrl) => {
    // TODO: Solana name service support (Bonfida SNS, etc.)
    return { name: null, avatar: null }
  },
}

/**
 * Hook for resolving addresses to ENS names and avatars.
 *
 * Uses viem for ENS resolution. Supports Solana name services in the future.
 *
 * @example Basic usage
 * ```tsx
 * function Profile({ address }: { address: string }) {
 *   const identity = useResolvedIdentity({ address });
 *
 *   switch (identity.status) {
 *     case 'idle':
 *       return null;
 *     case 'loading':
 *       return <p>Resolving...</p>;
 *     case 'error':
 *       return <p>Error: {identity.error.message}</p>;
 *     case 'success':
 *       return (
 *         <div>
 *           {identity.avatar && <img src={identity.avatar} alt="Avatar" />}
 *           <p>{identity.name ?? address}</p>
 *         </div>
 *       );
 *   }
 * }
 * ```
 *
 * @example With enabled option
 * ```tsx
 * const identity = useResolvedIdentity({
 *   address: wallet.status === 'connected' ? wallet.address : '',
 *   enabled: wallet.status === 'connected',
 * });
 * ```
 */
export function useResolvedIdentity(options: UseResolvedIdentityOptions): ResolvedIdentity {
  const { address, chainType = 'ethereum', ensChainId = 1, enabled = true } = options

  const { config } = useCoreContext()
  const rpcUrl = config.rpcUrls?.ethereum?.[ensChainId] ?? getDefaultEthereumRpcUrl(ensChainId)

  const isEnabled = enabled && !!address && address.length > 0

  const query = useQuery({
    queryKey: ['identity', chainType, address, ensChainId],
    queryFn: () => resolvers[chainType](address, rpcUrl),
    enabled: isEnabled,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  })

  // Discriminated union return - status-based
  if (!isEnabled) {
    return { status: 'idle' }
  }

  if (query.isLoading || query.isPending) {
    return { status: 'loading' }
  }

  if (query.error) {
    return { status: 'error', error: query.error as Error }
  }

  return {
    status: 'success',
    name: query.data?.name ?? null,
    avatar: query.data?.avatar ?? null,
  }
}
