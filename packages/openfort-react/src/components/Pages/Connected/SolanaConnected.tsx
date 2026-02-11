/**
 * Solana Connected Page
 *
 * Displays the connected Solana wallet with balance and actions.
 * Uses the internal useSolanaBalance hook for balance display.
 */

import type React from 'react'
import { useEffect } from 'react'
import { ReceiveIcon, SendIcon, UserRoundIcon } from '../../../assets/icons'
import { useEmbeddedWallet } from '../../../hooks/useEmbeddedWallet'
import useLocales from '../../../hooks/useLocales'
import { useSolanaBalance } from '../../../solana/hooks/useSolanaBalance'
import { useSolanaContext } from '../../../solana/providers/SolanaContextProvider'
import { nFormatter, truncateEthAddress } from '../../../utils'
import Avatar from '../../Common/Avatar'
import Button from '../../Common/Button'
import { TextLinkButton } from '../../Common/Button/styles'
import { CopyText } from '../../Common/CopyToClipboard/CopyText'
import { ModalBody, ModalContent, ModalH1 } from '../../Common/Modal/styles'
import PoweredByFooter from '../../Common/PoweredByFooter'
import { routes } from '../../Openfort/types'
import { useOpenfort } from '../../Openfort/useOpenfort'
import { PageContent } from '../../PageContent'
import {
  ActionButton,
  ActionButtonsContainer,
  AvatarContainer,
  AvatarInner,
  Balance,
  BalanceContainer,
  ClusterBadge,
  LinkedProvidersToggle,
  LoadingBalance,
} from './styles'

const SolanaConnected: React.FC = () => {
  const context = useOpenfort()
  const { setHeaderLeftSlot, setRoute } = context
  const locales = useLocales()

  // Get Solana context for cluster info
  const { cluster } = useSolanaContext()

  const embeddedWallet = useEmbeddedWallet()
  const address = embeddedWallet.status === 'connected' ? embeddedWallet.activeWallet.address : undefined

  // Fetch balance using internal hook
  const { data: balance, isLoading: isBalanceLoading } = useSolanaBalance(address)

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

  const solanaUI = context.walletConfig?.solana?.ui
  const clusterDisplay = cluster === 'mainnet-beta' ? 'Mainnet' : cluster.charAt(0).toUpperCase() + cluster.slice(1)
  const showClusterSelector = !solanaUI?.hideClusterSelector
  const CustomAvatar = solanaUI?.customAvatar

  return (
    <PageContent onBack={null} header={locales.profileScreen_heading}>
      <ModalContent style={{ paddingBottom: 6, gap: 6 }}>
        {address ? (
          <>
            <AvatarContainer>
              <AvatarInner>
                {showClusterSelector ? (
                  <ClusterBadge
                    $cluster={cluster}
                    as="button"
                    type="button"
                    onClick={() => setRoute(routes.SOL_SWITCH_CLUSTER)}
                    title="Switch cluster"
                    style={{ cursor: 'pointer' }}
                  >
                    {clusterDisplay}
                  </ClusterBadge>
                ) : null}
                {CustomAvatar ? <CustomAvatar address={address} /> : <Avatar address={address} />}
              </AvatarInner>
            </AvatarContainer>
            <ModalH1>
              <CopyText value={address}>{truncateEthAddress(address)}</CopyText>
            </ModalH1>
            {context?.uiConfig.hideBalance ? null : (
              <ModalBody>
                <BalanceContainer>
                  {balance && !isBalanceLoading && (
                    <TextLinkButton type="button" disabled>
                      <Balance
                        key="solana-balance"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        {nFormatter(balance.sol)} SOL
                      </Balance>
                    </TextLinkButton>
                  )}
                  {isBalanceLoading && (
                    <LoadingBalance
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      &nbsp;
                    </LoadingBalance>
                  )}
                </BalanceContainer>
                <ActionButtonsContainer>
                  <ActionButton
                    icon={<SendIcon />}
                    onClick={() => {
                      context.setRoute(routes.SOL_SEND)
                    }}
                  >
                    Send
                  </ActionButton>
                  <ActionButton
                    icon={<ReceiveIcon />}
                    onClick={() => {
                      context.setRoute(routes.SOL_RECEIVE)
                    }}
                  >
                    Receive
                  </ActionButton>
                </ActionButtonsContainer>
              </ModalBody>
            )}
          </>
        ) : (
          <Button onClick={() => setRoute(routes.SOL_CREATE_WALLET)}>Create Solana Wallet</Button>
        )}
      </ModalContent>
      <PoweredByFooter />
    </PageContent>
  )
}

export default SolanaConnected
