'use client'

import { useCallback, useMemo } from 'react'
import type { Transport } from 'viem'
import { createWalletClient, custom, numberToHex } from 'viem'
import { erc7811Actions } from 'viem/experimental'
import type { getAssets } from 'viem/experimental/erc7811'
import type { Asset } from '../../components/Openfort/types'
import { useOpenfortUIContext as useOpenfort } from '../../components/Openfort/useOpenfort'
import { OpenfortError, OpenfortReactErrorType } from '../../core/errors'
import type { EthereumConfig } from '../../ethereum/types'
import { useUser } from '../../hooks/openfort/useUser'
import { openfortKeys } from '../../query/queryKeys'
import { useAsyncData } from '../../shared/hooks/useAsyncData'
import { useEthereumEmbeddedWallet } from './useEthereumEmbeddedWallet'

type UseEthereumWalletAssetsOptions = {
  assets?: EthereumConfig['assets']
  staleTime?: number
}

/**
 * Returns wallet assets (tokens, NFTs) for the connected Ethereum address.
 * Uses ERC-7811 via Openfort's authenticated RPC proxy.
 *
 * @param options - Optional custom assets config and staleTime
 * @returns assets, isLoading, error, refetch
 *
 * @example
 * ```tsx
 * const { data: assets, isLoading } = useEthereumWalletAssets()
 * ```
 */
export const useEthereumWalletAssets = ({
  assets: hookCustomAssets,
  staleTime = 30000,
}: UseEthereumWalletAssetsOptions = {}) => {
  const wallet = useEthereumEmbeddedWallet()
  const isConnected = wallet.status === 'connected'
  const address = isConnected ? wallet.address : undefined
  const chainId = isConnected ? wallet.chainId : undefined

  const { walletConfig, publishableKey, overrides, thirdPartyAuth, chains } = useOpenfort()
  const { getAccessToken } = useUser()
  const chain = chains.find((c) => c.id === chainId)

  const buildHeaders = useCallback(async () => {
    if (thirdPartyAuth) {
      const accessToken = await thirdPartyAuth.getAccessToken()

      if (!accessToken) {
        throw new OpenfortError(
          'Failed to get access token from third party auth provider',
          OpenfortReactErrorType.AUTHENTICATION_ERROR
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
    const assetsFromConfig = walletConfig?.ethereum?.assets ? walletConfig.ethereum.assets[chainId] || [] : []
    const assetsFromHook = hookCustomAssets ? hookCustomAssets[chainId] || [] : []
    const allAssets = [...assetsFromConfig, ...assetsFromHook]
    return allAssets
  }, [walletConfig?.ethereum?.assets, hookCustomAssets, chainId])

  const { data, error, isLoading, refetch } = useAsyncData({
    queryKey: [...openfortKeys.walletAssets(chainId!, customAssetsToFetch, address)],
    queryFn: async () => {
      if (!address || !chainId || !chain) {
        throw new OpenfortError('Wallet not connected', OpenfortReactErrorType.UNEXPECTED_ERROR, {
          error: new Error('Address, chainId, or chain not available'),
        })
      }

      const customClient = createWalletClient({
        account: address as `0x${string}`,
        chain,
        transport: customTransport(),
      })

      const extendedClient = customClient.extend(erc7811Actions())

      const defaultAssetsPromise = extendedClient.getAssets({
        chainIds: [chainId],
      })

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
          : Promise.resolve({ [hexChainId]: [] as getAssets.Asset<false>[] })

      const [defaultAssetsRaw, customAssets] = await Promise.all([defaultAssetsPromise, customAssetsPromise])

      // ERC-7811 response keys may be hex (e.g. "0x14a34") or numeric depending on the RPC
      const rawByChain = defaultAssetsRaw as unknown as Record<string, getAssets.Asset<false>[]>
      const customByChain = customAssets as unknown as Record<string, getAssets.Asset<false>[]>

      const rawChainAssets = rawByChain[hexChainId] ?? rawByChain[String(chainId)] ?? []
      const customChainAssets = customByChain[hexChainId] ?? customByChain[String(chainId)] ?? []

      const defaultAssets = rawChainAssets.map<Asset>((a) => {
        let asset: Asset
        if (a.type === 'erc20') {
          // The ERC-7811 metadata type does not include `fiat`; it is a non-standard
          // extension returned by Openfort's RPC proxy.
          type ExtendedMeta = {
            name?: string
            symbol?: string
            decimals?: number
            fiat?: Asset['metadata'] extends { fiat?: infer F } ? F : never
          }
          const meta = a.metadata as ExtendedMeta | undefined
          asset = {
            type: 'erc20' as const,
            address: a.address,
            balance: a.balance,
            metadata: {
              name: meta?.name || 'Unknown Token',
              symbol: meta?.symbol || 'UNKNOWN',
              decimals: meta?.decimals,
              fiat: meta?.fiat,
            },
            raw: a,
          }
        } else if (a.type === 'native') {
          // The native asset metadata type does not include `fiat` or `name` in the
          // standard ERC-7811 spec; Openfort's proxy extends it with a `fiat` field.
          // The Asset type requires fiat to be present when metadata exists, so we
          // omit metadata entirely when fiat is unavailable.
          type ExtendedNativeMeta = { symbol?: string; decimals?: number; fiat?: { value: number; currency: string } }
          const meta = a.metadata as ExtendedNativeMeta | undefined
          asset = {
            type: 'native' as const,
            address: 'native',
            balance: a.balance,
            metadata: meta?.fiat ? { symbol: meta.symbol ?? '', decimals: meta.decimals, fiat: meta.fiat } : undefined,
            raw: a,
          }
        } else {
          throw new OpenfortError('Unsupported asset type', OpenfortReactErrorType.UNEXPECTED_ERROR, { error: a })
        }
        return asset
      })

      const mergedAssets = [...defaultAssets]
      const customAssetsForChain: Asset[] = customChainAssets.flatMap((asset: getAssets.Asset<false>) => {
        // Custom assets are explicitly requested as erc20; skip if the API returns something unexpected.
        if (asset.type !== 'erc20') return []
        if (!walletConfig?.ethereum?.assets) return [{ ...asset, raw: asset }]

        const configAsset = walletConfig.ethereum.assets[chainId]?.find(
          (a) => a.toLowerCase() === asset.address.toLowerCase()
        )
        if (!configAsset) return [{ ...asset, raw: asset }]

        return [
          {
            type: 'erc20' as const,
            address: asset.address,
            balance: asset.balance,
            metadata: asset.metadata,
            raw: asset,
          } satisfies Asset,
        ]
      })

      customAssetsForChain.forEach((asset) => {
        if (!mergedAssets.find((a) => a.address === asset.address)) {
          mergedAssets.push(asset)
        }
      })

      return mergedAssets as readonly Asset[]
    },
    enabled: isConnected && !!chainId && !!chain && !!address,
    staleTime,
  })

  const mappedError = useMemo(() => {
    if (!error) return undefined

    if (error instanceof OpenfortError) {
      return error
    }

    return new OpenfortError('Failed to fetch wallet assets', OpenfortReactErrorType.UNEXPECTED_ERROR, { error })
  }, [error])

  return {
    data: data ?? null,
    isLoading,
    isError: !!error,
    isSuccess: !!data && !error,
    isIdle: !isConnected || !chainId || !chain,
    error: mappedError,
    refetch,
  }
}
