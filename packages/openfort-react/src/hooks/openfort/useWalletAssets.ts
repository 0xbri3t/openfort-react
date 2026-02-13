import { useQuery } from '@tanstack/react-query'
import { useCallback, useMemo } from 'react'
import type { Transport } from 'viem'
import { createWalletClient, custom, numberToHex } from 'viem'
import { erc7811Actions } from 'viem/experimental'
import type { getAssets } from 'viem/experimental/erc7811'
import type { Asset } from '../../components/Openfort/types'
import { useOpenfort } from '../../components/Openfort/useOpenfort'
import { OpenfortError, OpenfortErrorCode } from '../../core/errors'
import type { OpenfortWalletConfig } from '../../types'
import { useChains } from '../useChains'
import { useConnectedWallet } from '../useConnectedWallet'
import { useUser } from './useUser'

type WalletAssetsHookOptions = {
  assets?: OpenfortWalletConfig['assets']
  staleTime?: number
}

/** Returns wallet assets (tokens, NFTs) for the connected address. Supports custom asset config. */
/**
 * Returns wallet assets (tokens) for the connected account. Supports ERC-7811.
 *
 * @param options - Optional custom assets config and staleTime
 * @returns assets, isLoading, error, refetch
 *
 * @example
 * ```tsx
 * const { assets, isLoading } = useWalletAssets()
 * ```
 */
export const useWalletAssets = ({ assets: hookCustomAssets, staleTime = 30000 }: WalletAssetsHookOptions = {}) => {
  // Use new abstraction hooks (no wagmi)
  const wallet = useConnectedWallet()
  const chains = useChains()

  const isConnected = wallet.status === 'connected'
  const address = isConnected ? wallet.address : undefined
  const chainId = isConnected ? wallet.chainId : undefined

  const { walletConfig, publishableKey, overrides, thirdPartyAuth } = useOpenfort()
  const { getAccessToken } = useUser()

  // Find current chain config
  const chain = chains.find((c) => c.id === chainId)

  const buildHeaders = useCallback(async () => {
    if (thirdPartyAuth) {
      const accessToken = await thirdPartyAuth.getAccessToken()

      if (!accessToken) {
        throw new OpenfortError(
          'Failed to get access token from third party auth provider',
          OpenfortErrorCode.NOT_AUTHENTICATED
        )
      }
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-auth-provider': thirdPartyAuth.provider,
        'x-player-token': accessToken,
        'x-token-type': 'idToken',
        Authorization: `Bearer ${publishableKey}`,
      }
      return headers
    }
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-project-key': publishableKey,
      Authorization: `Bearer ${await getAccessToken()}`,
    }
    return headers
  }, [publishableKey, getAccessToken, thirdPartyAuth])

  const customTransport = useMemo(
    () => (): Transport => {
      return custom({
        async request({ method, params }) {
          const res = await fetch(`${overrides?.backendUrl || 'https://api.openfort.io'}/rpc`, {
            method: 'POST',
            headers: await buildHeaders(),
            body: JSON.stringify({
              method,
              params: params[0],
              id: 1,
              jsonrpc: '2.0',
            }),
          })

          const data = await res.json()

          if (data.error) {
            throw new Error(data.error.message)
          }

          return data.result
        },
      })
    },
    [buildHeaders, overrides?.backendUrl]
  )

  const customAssetsToFetch = useMemo(() => {
    if (!chainId) return []
    const assetsFromConfig = walletConfig?.assets ? walletConfig.assets[chainId] || [] : []
    const assetsFromHook = hookCustomAssets ? hookCustomAssets[chainId] || [] : []
    const allAssets = [...assetsFromConfig, ...assetsFromHook]
    return allAssets
  }, [walletConfig?.assets, hookCustomAssets, chainId])

  const { data, error, isLoading, isError, isSuccess, refetch } = useQuery({
    queryKey: ['wallet-assets', chainId, customAssetsToFetch, address],
    queryFn: async () => {
      if (!address || !chainId || !chain) {
        throw new OpenfortError('Wallet not connected', OpenfortErrorCode.UNKNOWN_ERROR, {
          cause: new Error('Address, chainId, or chain not available'),
        })
      }

      const customClient = createWalletClient({
        account: address as `0x${string}`,
        chain,
        transport: customTransport(),
      })

      const extendedClient = customClient.extend(erc7811Actions())

      // Fetch default assets
      const defaultAssetsPromise = extendedClient.getAssets({
        chainIds: [chainId],
      })

      // Fetch custom ERC20 assets
      const hexChainId = numberToHex(chainId)
      const customAssetsPromise =
        customAssetsToFetch.length > 0
          ? extendedClient.getAssets({
              chainIds: [chainId],
              assets: {
                [hexChainId]: customAssetsToFetch.map((a) => ({
                  address: a,
                  type: 'erc20' as const,
                })),
              },
            })
          : Promise.resolve({ [chainId]: [] as getAssets.Asset<false>[] })

      const [defaultAssetsRaw, customAssets] = await Promise.all([defaultAssetsPromise, customAssetsPromise])

      // Merge assets, avoiding duplicates
      const defaultAssets = defaultAssetsRaw[chainId].map<Asset>((a) => {
        let asset: Asset
        if (a.type === 'erc20') {
          asset = {
            type: 'erc20' as const,
            address: a.address,
            balance: a.balance,
            metadata: {
              name: a.metadata?.name || 'Unknown Token',
              symbol: a.metadata?.symbol || 'UNKNOWN',
              decimals: a.metadata?.decimals,
              fiat: (a.metadata as any)?.fiat,
            },
            raw: a,
          }
        } else if (a.type === 'native') {
          const notStandardMetadata = a.metadata as any
          asset = {
            type: 'native' as const,
            address: 'native',
            balance: a.balance,
            metadata: {
              name: notStandardMetadata?.name,
              symbol: notStandardMetadata?.symbol,
              decimals: notStandardMetadata?.decimals,
              fiat: notStandardMetadata?.fiat,
            },
            raw: a,
          }
        } else {
          throw new OpenfortError('Unsupported asset type', OpenfortErrorCode.UNKNOWN_ERROR, { cause: a })
        }
        return asset
      })

      const mergedAssets = defaultAssets
      const customAssetsForChain: Asset[] = customAssets[chainId].map((asset: getAssets.Asset<false>) => {
        if (asset.type !== 'erc20') return { ...asset, raw: asset } as unknown as Asset
        if (!walletConfig?.assets) return { ...asset, raw: asset }

        const configAsset = walletConfig.assets[chainId].find((a) => a.toLowerCase() === asset.address.toLowerCase())
        if (!configAsset) return { ...asset, raw: asset }

        const safeAsset: Asset = {
          type: 'erc20' as const,
          address: asset.address,
          balance: asset.balance,
          metadata: asset.metadata,
          raw: asset,
        }
        return safeAsset
      })

      if (customAssetsForChain) {
        customAssetsForChain.forEach((asset) => {
          if (!mergedAssets.find((a) => a.address === asset.address)) {
            mergedAssets.push(asset)
          }
        })
      }

      return mergedAssets as readonly Asset[]
    },
    enabled: isConnected && !!chainId && !!chain && !!address,
    retry: 2,
    staleTime, // Data fresh for 30 seconds
    gcTime: 5 * 60 * 1000,
    throwOnError: false,
  })

  // Map TanStack Query error to OpenfortError
  const mappedError = useMemo(() => {
    if (!error) return undefined

    if (error instanceof OpenfortError) {
      return error
    }

    return new OpenfortError('Failed to fetch wallet assets', OpenfortErrorCode.UNKNOWN_ERROR, { cause: error })
  }, [error])

  return {
    data: data ?? null,
    isLoading,
    isError,
    isSuccess,
    isIdle: !isConnected || !chainId || !chain,
    error: mappedError,
    refetch,
  }
}
