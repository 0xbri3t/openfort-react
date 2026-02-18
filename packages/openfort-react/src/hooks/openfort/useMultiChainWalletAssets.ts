import { useQuery } from '@tanstack/react-query'
import { useCallback, useMemo } from 'react'
import { formatUnits, numberToHex } from 'viem'
import { useAccount } from 'wagmi'
import type { Asset, MultiChainAsset } from '../../components/Openfort/types'
import { useOpenfort } from '../../components/Openfort/useOpenfort'
import { OpenfortError, OpenfortReactErrorType } from '../../types'
import { useUser } from './useUser'

type MultiChainWalletAssetsOptions = {
  staleTime?: number
}

export const useMultiChainWalletAssets = ({ staleTime = 30000 }: MultiChainWalletAssetsOptions = {}) => {
  const { publishableKey, overrides, thirdPartyAuth, walletConfig } = useOpenfort()
  const { address } = useAccount()
  const { getAccessToken } = useUser()

  // Convert walletConfig.assets { [chainId: number]: Hex[] } to backend format { [hexChainId]: [{ address, type }] }
  const customAssets = useMemo(() => {
    const configAssets = walletConfig?.assets
    if (!configAssets) return undefined
    const mapped: Record<string, { address: string; type: string }[]> = {}
    for (const [chainId, addresses] of Object.entries(configAssets)) {
      const hexChainId = numberToHex(Number(chainId))
      mapped[hexChainId] = addresses.map((addr) => ({ address: addr, type: 'erc20' }))
    }
    return Object.keys(mapped).length > 0 ? mapped : undefined
  }, [walletConfig?.assets])

  const buildHeaders = useCallback(async (): Promise<Record<string, string>> => {
    if (thirdPartyAuth) {
      const accessToken = await thirdPartyAuth.getAccessToken()
      if (!accessToken) {
        throw new OpenfortError(
          'Failed to get access token from third party auth provider',
          OpenfortReactErrorType.AUTHENTICATION_ERROR
        )
      }
      return {
        'Content-Type': 'application/json',
        'x-auth-provider': thirdPartyAuth.provider,
        'x-player-token': accessToken,
        'x-token-type': 'idToken',
        Authorization: `Bearer ${publishableKey}`,
      }
    }
    return {
      'Content-Type': 'application/json',
      'x-project-key': publishableKey,
      Authorization: `Bearer ${await getAccessToken()}`,
    }
  }, [publishableKey, getAccessToken, thirdPartyAuth])

  const backendUrl = overrides?.backendUrl || 'https://api.openfort.io'

  const { data, error, isLoading, isError, isSuccess, refetch } = useQuery({
    queryKey: ['multi-chain-wallet-assets', address, customAssets],
    queryFn: async () => {
      if (!address) {
        throw new OpenfortError('No wallet address available', OpenfortReactErrorType.UNEXPECTED_ERROR)
      }

      const headers = await buildHeaders()

      // Request 1: project defaults — returns native + default ERC20s
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

      // Request 2: custom ERC20s from walletConfig.assets (if any)
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

      // Merge default + custom results, deduplicating by address per chain
      const result: Record<string, any[]> = { ...(defaultData.result ?? {}) }
      if (customData?.result) {
        for (const [chainKey, assets] of Object.entries(customData.result)) {
          if (!Array.isArray(assets)) continue
          if (!result[chainKey]) {
            result[chainKey] = assets
          } else {
            const existing = new Map(result[chainKey].map((a: any) => [a.address, a]))
            for (const asset of assets as any[]) {
              existing.set(asset.address, asset)
            }
            result[chainKey] = Array.from(existing.values())
          }
        }
      }
      const allAssets: MultiChainAsset[] = []

      // Transform into typed Asset format and flatten into single array
      for (const [chainIdKey, assets] of Object.entries(result)) {
        const chainId = Number(chainIdKey)
        if (!Array.isArray(assets)) continue
        for (const a of assets) {
          let asset: Asset
          if (a.type === 'erc20') {
            asset = {
              type: 'erc20' as const,
              address: a.address,
              balance: BigInt(a.balance),
              metadata: {
                name: a.metadata?.name || 'Unknown Token',
                symbol: a.metadata?.symbol || 'UNKNOWN',
                decimals: a.metadata?.decimals,
                fiat: a.metadata?.fiat,
              },
              raw: a,
            }
          } else if (a.type === 'native') {
            asset = {
              type: 'native' as const,
              address: 'native',
              balance: BigInt(a.balance),
              metadata: {
                symbol: a.metadata?.symbol || 'ETH',
                decimals: a.metadata?.decimals,
                fiat: a.metadata?.fiat,
              },
              raw: a,
            }
          } else {
            continue
          }
          allAssets.push({ ...asset, chainId })
        }
      }

      // Sort by USD value descending
      allAssets.sort((a, b) => {
        const aUsd = getUsdValue(a)
        const bUsd = getUsdValue(b)
        return bUsd - aUsd
      })

      return allAssets as readonly MultiChainAsset[]
    },
    enabled: !!address,
    retry: 2,
    staleTime,
    throwOnError: false,
  })

  const mappedError = useMemo(() => {
    if (!error) return undefined
    if (error instanceof OpenfortError) return error
    return new OpenfortError('Failed to fetch multi-chain wallet assets', OpenfortReactErrorType.UNEXPECTED_ERROR, {
      error,
    })
  }, [error])

  return {
    data: data ?? null,
    isLoading,
    isError,
    isSuccess,
    isIdle: !address,
    error: mappedError,
    refetch,
  }
}

function getUsdValue(asset: Asset): number {
  const fiat = asset.metadata?.fiat
  if (!fiat?.value || asset.balance === undefined) return 0
  const decimals = asset.metadata?.decimals ?? 18
  const amount = Number.parseFloat(formatUnits(asset.balance, decimals))
  return Number.isFinite(amount) ? amount * fiat.value : 0
}
