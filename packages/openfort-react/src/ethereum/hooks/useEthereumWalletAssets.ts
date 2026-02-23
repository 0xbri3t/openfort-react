import { useCallback, useMemo } from 'react'
import type { Transport } from 'viem'
import { createWalletClient, custom, numberToHex } from 'viem'
import { erc7811Actions } from 'viem/experimental'
import type { getAssets } from 'viem/experimental/erc7811'
import type { Asset } from '../../components/Openfort/types'
import { useOpenfort } from '../../components/Openfort/useOpenfort'
import { OpenfortError, OpenfortReactErrorType } from '../../core/errors'
import type { EthereumWalletConfig } from '../../ethereum/types'
import { useUser } from '../../hooks/openfort/useUser'
import { useAsyncData } from '../../shared/hooks/useAsyncData'
import { useEthereumEmbeddedWallet } from './useEthereumEmbeddedWallet'

type UseEthereumWalletAssetsOptions = {
  assets?: EthereumWalletConfig['assets']
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
    queryKey: ['wallet-assets', chainId, customAssetsToFetch, address],
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
          : Promise.resolve({ [chainId]: [] as getAssets.Asset<false>[] })

      const [defaultAssetsRaw, customAssets] = await Promise.all([defaultAssetsPromise, customAssetsPromise])

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
          throw new OpenfortError('Unsupported asset type', OpenfortReactErrorType.UNEXPECTED_ERROR, { error: a })
        }
        return asset
      })

      const mergedAssets = [...defaultAssets]
      const customAssetsForChain: Asset[] = customAssets[chainId].map((asset: getAssets.Asset<false>) => {
        if (asset.type !== 'erc20') return { ...asset, raw: asset } as unknown as Asset
        if (!walletConfig?.ethereum?.assets) return { ...asset, raw: asset }

        const configAsset = walletConfig.ethereum.assets[chainId].find(
          (a) => a.toLowerCase() === asset.address.toLowerCase()
        )
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
