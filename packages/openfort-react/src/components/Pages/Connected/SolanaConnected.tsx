/**
 * Solana Connected Page
 *
 * Displays the connected Solana wallet with balance and actions.
 * Uses the internal useSolanaBalance hook for balance display.
 */

import type React from 'react'
import { useEffect } from 'react'
import { ReceiveIcon, SendIcon, UserRoundIcon } from '../../../assets/icons'
import useLocales from '../../../hooks/useLocales'
import { useSolanaBalance } from '../../../solana/hooks/useSolanaBalance'
import { useSolanaEmbeddedWallet } from '../../../solana/hooks/useSolanaEmbeddedWallet'
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
  Unsupported,
} from './styles'

const SolanaConnected: React.FC = () => {
  const context = useOpenfort()
  const { setHeaderLeftSlot, setRoute } = context
  const locales = useLocales()

  // Get Solana context for cluster info
  const { cluster } = useSolanaContext()

  // Get Solana wallet state
  const solana = useSolanaEmbeddedWallet()
  const address = solana.status === 'connected' ? solana.activeWallet.address : undefined

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

  // Format cluster name for display
  const clusterDisplay = cluster === 'mainnet-beta' ? 'Mainnet' : cluster.charAt(0).toUpperCase() + cluster.slice(1)

  return (
    <PageContent onBack={null} header={locales.profileScreen_heading}>
      <ModalContent style={{ paddingBottom: 6, gap: 6 }}>
        {address ? (
          <>
            <AvatarContainer>
              <AvatarInner>
                <ClusterBadge $cluster={cluster}>{clusterDisplay}</ClusterBadge>
                {/* Solana address passed as name since Avatar expects 0x addresses */}
                <Avatar name={address} />
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
          <Button
            onClick={() => {
              // Create a new Solana wallet
              if (solana.status === 'disconnected' || solana.status === 'error') {
                solana.create()
              }
            }}
            icon={
              <Unsupported initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <svg width="130" height="120" viewBox="0 0 13 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <title>No wallet icon</title>
                  <path
                    d="M2.61317 11.2501H9.46246C10.6009 11.2501 11.3256 10.3506 11.3256 9.3549C11.3256 9.05145 11.255 8.73244 11.0881 8.43303L7.65903 2.14708C7.659 2.14702 7.65897 2.14696 7.65893 2.1469C7.65889 2.14682 7.65884 2.14673 7.65879 2.14664C7.31045 1.50746 6.6741 1.17871 6.04 1.17871C5.41478 1.17871 4.763 1.50043 4.41518 2.14968L0.993416 8.43476C0.828865 8.72426 0.75 9.04297 0.75 9.3549C0.75 10.3506 1.47471 11.2501 2.61317 11.2501Z"
                    fill="currentColor"
                    stroke="var(--ck-body-background, #fff)"
                    strokeWidth="1.5"
                  />
                  <path
                    d="M6.03258 7.43916C5.77502 7.43916 5.63096 7.29153 5.62223 7.02311L5.55675 4.96973C5.54802 4.69684 5.74446 4.5 6.02821 4.5C6.3076 4.5 6.51277 4.70131 6.50404 4.9742L6.43856 7.01864C6.42546 7.29153 6.2814 7.43916 6.03258 7.43916ZM6.03258 9.11676C5.7401 9.11676 5.5 8.9065 5.5 8.60677C5.5 8.30704 5.7401 8.09678 6.03258 8.09678C6.32506 8.09678 6.56515 8.30256 6.56515 8.60677C6.56515 8.91097 6.32069 9.11676 6.03258 9.11676Z"
                    fill="white"
                  />
                </svg>
              </Unsupported>
            }
          >
            Create Solana Wallet
          </Button>
        )}
      </ModalContent>
      <PoweredByFooter />
    </PageContent>
  )
}

export default SolanaConnected
