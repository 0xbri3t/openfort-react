import { useQuery } from '@tanstack/react-query'
import { useCallback, useMemo } from 'react'
import { createWalletClient, custom, formatUnits, numberToHex } from 'viem'
import type { getAssets } from 'viem/_types/experimental/erc7811/actions/getAssets'
import { erc7811Actions } from 'viem/experimental'
import { type Transport, useAccount, useChainId, useWalletClient } from 'wagmi'
import type { Asset, MultiChainAsset } from '../../components/Openfort/types'
import { useOpenfort } from '../../components/Openfort/useOpenfort'
import { OpenfortError, OpenfortReactErrorType, type OpenfortWalletConfig } from '../../types'
import { useUser } from './useUser'

type WalletAssetsHookOptions = {
  assets?: OpenfortWalletConfig['assets']
  /** When true, fetches assets for all configured chains and returns MultiChainAsset[]; otherwise single chain Asset[]. */
  multiChain?: boolean
  staleTime?: number
}

type WalletAssetsReturnBase = {
  isLoading: boolean
  isError: boolean
  isSuccess: boolean
  isIdle: boolean
  error: OpenfortError | undefined
  refetch: () => void
}

export type UseWalletAssetsResult =
  | (WalletAssetsReturnBase & { multiChain: true; data: readonly MultiChainAsset[] | null })
  | (WalletAssetsReturnBase & { multiChain: false; data: readonly Asset[] | null })

export function useWalletAssets({
  assets: hookCustomAssets,
  multiChain = false,
  staleTime = 30000,
}: WalletAssetsHookOptions = {}): UseWalletAssetsResult {
  const chainId = useChainId()
  const { data: walletClient } = useWalletClient()
  const { walletConfig, publishableKey, overrides, thirdPartyAuth } = useOpenfort()
  const { address } = useAccount()
  const { getAccessToken } = useUser()

  const backendUrl = overrides?.backendUrl || 'https://api.openfort.io'

  /** For multiChain: walletConfig.assets as backend assetFilter format (hex chainId -> [{ address, type }]). */
  const customAssets = useMemo(() => {
    if (!multiChain) return undefined
    const configAssets = walletConfig?.assets
    if (!configAssets) return undefined
    const mapped: Record<string, { address: string; type: string }[]> = {}
    for (const [cid, addresses] of Object.entries(configAssets)) {
      const hexChainId = numberToHex(Number(cid))
      mapped[hexChainId] = addresses.map((addr) => ({ address: addr, type: 'erc20' }))
    }
    return Object.keys(mapped).length > 0 ? mapped : undefined
  }, [multiChain, walletConfig?.assets])

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
    [publishableKey, getAccessToken]
  )

  const customAssetsToFetch = useMemo(() => {
    const assetsFromConfig = walletConfig?.assets ? walletConfig.assets[chainId] || [] : []
    const assetsFromHook = hookCustomAssets ? hookCustomAssets[chainId] || [] : []
    const allAssets = [...assetsFromConfig, ...assetsFromHook]
    return allAssets
  }, [walletConfig?.assets, hookCustomAssets, chainId])

  const { data, error, isLoading, isError, isSuccess, refetch } = useQuery({
    queryKey: multiChain
      ? (['wallet-assets', 'multi', address, customAssets] as const)
      : (['wallet-assets', chainId, customAssetsToFetch, address] as const),
    queryFn: async (): Promise<readonly Asset[] | readonly MultiChainAsset[]> => {
      if (multiChain) {
        if (!address) {
          throw new OpenfortError('No wallet address available', OpenfortReactErrorType.UNEXPECTED_ERROR)
        }
        const headers = await buildHeaders()
        const defaultRequest = fetch(`${backendUrl}/rpc`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            method: 'wallet_getAssets',
            params: { account: address },
            id: 1,
            jsonrpc: '2.0',
          }),
        })
        const customRequest = customAssets
          ? fetch(`${backendUrl}/rpc`, {
              method: 'POST',
              headers,
              body: JSON.stringify({
                method: 'wallet_getAssets',
                params: { account: address, assetFilter: customAssets },
                id: 2,
                jsonrpc: '2.0',
              }),
            })
          : null
        const responses = await Promise.all([defaultRequest, customRequest].filter(Boolean) as Promise<Response>[])
        const [defaultData, customData] = await Promise.all(responses.map((r) => r.json()))
        const result: Record<string, unknown[]> = { ...(defaultData.result ?? {}) }
        if (customData?.result && typeof customData.result === 'object') {
          for (const [chainKey, assets] of Object.entries(customData.result)) {
            if (!Array.isArray(assets)) continue
            if (!result[chainKey]) {
              result[chainKey] = assets
            } else {
              const existing = new Map((result[chainKey] as { address?: string }[]).map((a) => [a.address ?? '', a]))
              for (const asset of assets as { address?: string }[]) {
                existing.set(asset.address ?? '', asset)
              }
              result[chainKey] = Array.from(existing.values())
            }
          }
        }
        const allAssets: MultiChainAsset[] = []
        for (const [chainIdKey, assets] of Object.entries(result)) {
          const cid = Number(chainIdKey)
          if (!Array.isArray(assets)) continue
          for (const a of assets as { type: string; address?: string; balance?: string; metadata?: unknown }[]) {
            if (a.type === 'erc20') {
              const asset: Asset = {
                type: 'erc20' as const,
                address: (a.address ?? '0x0') as `0x${string}`,
                balance: BigInt(a.balance ?? 0),
                metadata: {
                  name: (a.metadata as { name?: string } | undefined)?.name || 'Unknown Token',
                  symbol: (a.metadata as { symbol?: string } | undefined)?.symbol || 'UNKNOWN',
                  decimals: (a.metadata as { decimals?: number } | undefined)?.decimals,
                  fiat: (a.metadata as { fiat?: { value: number; currency: string } } | undefined)?.fiat,
                },
                raw: a as unknown as getAssets.Erc20Asset,
              }
              allAssets.push({ ...asset, chainId: cid })
            } else if (a.type === 'native') {
              const meta = (a.metadata ?? {}) as {
                symbol?: string
                decimals?: number
                fiat?: { value: number; currency: string }
              }
              const asset: Asset = {
                type: 'native' as const,
                address: 'native',
                balance: BigInt(a.balance ?? 0),
                metadata: {
                  symbol: meta.symbol || 'ETH',
                  decimals: meta.decimals,
                  fiat: meta.fiat ?? { value: 0, currency: 'USD' },
                },
                raw: a as unknown as getAssets.NativeAsset,
              }
              allAssets.push({ ...asset, chainId: cid })
            }
          }
        }
        allAssets.sort((a, b) => getUsdValue(b) - getUsdValue(a))
        return allAssets as readonly MultiChainAsset[]
      }

      if (!walletClient) {
        throw new OpenfortError('No wallet client available', OpenfortReactErrorType.UNEXPECTED_ERROR, {
          error: new Error('Wallet client not initialized'),
        })
      }

      const customClient = createWalletClient({
        account: walletClient.account,
        chain: walletClient.chain,
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

      const [defaultAssetsRaw, customAssetsRaw] = await Promise.all([defaultAssetsPromise, customAssetsPromise])

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
              fiat: (a.metadata as { fiat?: { value: number; currency: string } })?.fiat,
            },
            raw: a,
          }
        } else if (a.type === 'native') {
          const notStandardMetadata = (a.metadata ?? {}) as {
            name?: string
            symbol?: string
            decimals?: number
            fiat?: { value: number; currency: string }
          }
          asset = {
            type: 'native' as const,
            address: 'native',
            balance: a.balance,
            metadata: {
              symbol: notStandardMetadata.symbol ?? 'ETH',
              decimals: notStandardMetadata.decimals,
              fiat: notStandardMetadata.fiat ?? { value: 0, currency: 'USD' },
            },
            raw: a,
          }
        } else {
          throw new OpenfortError('Unsupported asset type', OpenfortReactErrorType.UNEXPECTED_ERROR, { asset: a })
        }
        return asset
      })

      const mergedAssets = [...defaultAssets]
      const customAssetsForChain: Asset[] = customAssetsRaw[chainId].map((asset: getAssets.Asset<false>) => {
        if (asset.type !== 'erc20') return { ...asset, raw: asset } as unknown as Asset
        if (!walletConfig?.assets) return { ...asset, raw: asset }

        const configAsset = walletConfig.assets[chainId].find((a) => a.toLowerCase() === asset.address.toLowerCase())
        if (!configAsset) return { ...asset, raw: asset }

        return {
          type: 'erc20' as const,
          address: asset.address,
          balance: asset.balance,
          metadata: asset.metadata,
          raw: asset,
        }
      })

      for (const asset of customAssetsForChain) {
        if (!mergedAssets.find((a) => a.address === asset.address)) {
          mergedAssets.push(asset)
        }
      }

      return mergedAssets as readonly Asset[]
    },
    enabled: multiChain ? !!address : !!walletClient,
    retry: 2,
    staleTime,
    throwOnError: false,
  })

  // Map TanStack Query error to OpenfortError
  const mappedError = useMemo(() => {
    if (!error) return undefined

    if (error instanceof OpenfortError) {
      return error
    }

    return new OpenfortError('Failed to fetch wallet assets', OpenfortReactErrorType.UNEXPECTED_ERROR, { error })
  }, [error])

  return {
    data: data ?? null,
    multiChain,
    isLoading,
    isError,
    isSuccess,
    isIdle: multiChain ? !address : !walletClient,
    error: mappedError,
    refetch,
  } as UseWalletAssetsResult
}

function getUsdValue(asset: Asset): number {
  const fiat = asset.metadata?.fiat
  if (!fiat?.value || asset.balance === undefined) return 0
  const decimals = asset.metadata?.decimals ?? 18
  const amount = Number.parseFloat(formatUnits(asset.balance, decimals))
  return Number.isFinite(amount) ? amount * fiat.value : 0
}
