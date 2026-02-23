/**
 * Solana Asset Inventory
 *
 * Mirrors Ethereum AssetInventory: shows SOL balance when user clicks balance on Connected page.
 * Matches Ethereum UX: balance click → asset list (or no-assets when empty).
 */

import { useAsyncData } from '../../../shared/hooks/useAsyncData'
import { useSolanaEmbeddedWallet } from '../../../solana/hooks/useSolanaEmbeddedWallet'
import { useSolanaContext } from '../../../solana/SolanaContext'
import { nFormatter } from '../../../utils'
import { ModalHeading } from '../../Common/Modal/styles'
import { EmptyState } from '../BuyProviderSelect/styles'
import {
  SelectTokenContent,
  TokenBalance,
  TokenContainer,
  TokenInfo,
  TokenList,
  TokenSymbol,
} from '../SelectToken/styles'

async function fetchSolanaBalance(rpcUrl: string, address: string): Promise<number> {
  const response = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'getBalance',
      params: [address],
    }),
  })
  const data = await response.json()
  return data.result?.value ?? 0
}

export const SolanaAssetInventory = () => {
  const wallet = useSolanaEmbeddedWallet()
  const { rpcUrl } = useSolanaContext()
  const address = wallet.status === 'connected' && wallet.address ? wallet.address : undefined

  const balanceResult = useAsyncData({
    queryKey: ['solana-asset-inventory', address, rpcUrl],
    queryFn: async () => {
      if (!address || !rpcUrl) return null
      const lamports = await fetchSolanaBalance(rpcUrl, address)
      return lamports / 1e9
    },
    enabled: Boolean(address && rpcUrl),
  })

  const balance = balanceResult.data
  const isBalancesLoading = balanceResult.isLoading

  const renderContent = () => {
    if (isBalancesLoading) {
      return <EmptyState>Loading balances…</EmptyState>
    }
    if (balance == null || balance <= 0) {
      return <EmptyState>No supported tokens found for this network yet.</EmptyState>
    }

    return (
      <TokenList>
        <TokenContainer>
          <TokenInfo>
            <TokenSymbol>SOL</TokenSymbol>
          </TokenInfo>
          <TokenInfo>
            <TokenBalance>{nFormatter(balance)} SOL</TokenBalance>
          </TokenInfo>
        </TokenContainer>
      </TokenList>
    )
  }

  return (
    <SelectTokenContent>
      <ModalHeading>Your assets</ModalHeading>
      {renderContent()}
    </SelectTokenContent>
  )
}
