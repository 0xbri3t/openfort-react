/**
 * Solana Connected Page
 *
 * Displays the connected Solana wallet with balance and actions.
 * Uses viem direct JSON-RPC calls for balance fetching.
 */

import { ChainTypeEnum } from '@openfort/openfort-js'
import { useQuery } from '@tanstack/react-query'
import type React from 'react'
import { useEffect } from 'react'
import { ReceiveIcon, SendIcon, UserRoundIcon } from '../../../assets/icons'
import useLocales from '../../../hooks/useLocales'
import { useOpenfortCore } from '../../../openfort/useOpenfort'
import { useSolanaEmbeddedWallet } from '../../../solana/hooks/useSolanaEmbeddedWallet'
import { useSolanaContext } from '../../../solana/SolanaContext'
import { nFormatter, truncateSolanaAddress } from '../../../utils'
import { logger } from '../../../utils/logger'
import Avatar from '../../Common/Avatar'
import Button from '../../Common/Button'
import { TextLinkButton } from '../../Common/Button/styles'
import { CopyText } from '../../Common/CopyToClipboard/CopyText'
import { useThemeContext } from '../../ConnectKitThemeProvider/ConnectKitThemeProvider'
import { routes } from '../../Openfort/types'
import { useOpenfort } from '../../Openfort/useOpenfort'
import { PageContent } from '../../PageContent'
import { ConnectedPageLayout } from './ConnectedPageLayout'
import { ActionButton, Balance, LinkedProvidersToggle } from './styles'

// Helper function to fetch Solana balance
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
  return data.result ?? 0
}

const SolanaConnected: React.FC = () => {
  const context = useOpenfort()
  const { setHeaderLeftSlot, setRoute } = context
  const locales = useLocales()

  const wallet = useSolanaEmbeddedWallet()
  const { embeddedAccounts } = useOpenfortCore()
  const { rpcUrl } = useSolanaContext()
  const hasSolanaWallets = (embeddedAccounts?.filter((a) => a.chainType === ChainTypeEnum.SVM) ?? []).length > 0
  const address = wallet.status === 'connected' ? wallet.address : undefined

  const balanceResult = useQuery({
    queryKey: ['solana-balance', address, rpcUrl],
    enabled: Boolean(address && rpcUrl),
    retry: true,
    retryDelay: 1000,
    queryFn: async () => {
      if (!address || !rpcUrl) return null
      try {
        const balanceLamports = await fetchSolanaBalance(rpcUrl, address)
        return balanceLamports / 1e9 // Convert lamports to SOL
      } catch (error) {
        logger.error('Failed to fetch Solana balance:', error)
        return null
      }
    },
  })

  const balance = balanceResult.data
  const isBalanceLoading = balanceResult.status === 'pending'

  useEffect(() => {
    if (!address) {
      setHeaderLeftSlot(null)
      return
    }

    setHeaderLeftSlot(
      <LinkedProvidersToggle
        type="button"
        onClick={() => setRoute(routes.PROFILE)}
        aria-label="Profile"
        title="Profile"
      >
        <UserRoundIcon />
      </LinkedProvidersToggle>
    )

    return () => {
      setHeaderLeftSlot(null)
    }
  }, [address, setHeaderLeftSlot, setRoute])

  const themeContext = useThemeContext()
  const solanaUI = context.walletConfig?.solana?.ui
  const CustomAvatar = solanaUI?.customAvatar
  const separator = ['web95', 'rounded', 'minimal'].includes(themeContext.theme ?? context.uiConfig.theme ?? '')
    ? '....'
    : undefined

  const avatar = address ? CustomAvatar ? <CustomAvatar address={address} /> : <Avatar address={address} /> : <span />

  const balanceNode =
    balance && !isBalanceLoading ? (
      <TextLinkButton type="button" disabled>
        <Balance
          key="solana-balance"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {nFormatter(balance)} SOL
        </Balance>
      </TextLinkButton>
    ) : null

  return (
    <PageContent onBack={null} header={locales.profileScreen_heading}>
      <ConnectedPageLayout
        address={address ?? ''}
        displayName={<CopyText value={address ?? ''}>{truncateSolanaAddress(address ?? '', separator)}</CopyText>}
        avatar={avatar}
        balance={balanceNode}
        actions={
          <>
            <ActionButton icon={<SendIcon />} onClick={() => context.setRoute(routes.SOL_SEND)}>
              Send
            </ActionButton>
            <ActionButton icon={<ReceiveIcon />} onClick={() => context.setRoute(routes.SOL_RECEIVE)}>
              Get
            </ActionButton>
          </>
        }
        hideBalance={context?.uiConfig.hideBalance}
        isBalanceLoading={isBalanceLoading}
        noWalletFallback={
          hasSolanaWallets ? (
            <Button onClick={() => setRoute(routes.SOL_WALLETS)}>Manage wallets</Button>
          ) : (
            <Button onClick={() => setRoute(routes.SOL_CREATE_WALLET)}>Create Solana Wallet</Button>
          )
        }
      />
    </PageContent>
  )
}

export default SolanaConnected
