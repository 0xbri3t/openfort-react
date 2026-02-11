/**
 * Solana Connected Page
 *
 * Displays the connected Solana wallet with balance and actions.
 * Uses the internal useSolanaBalance hook for balance display.
 */

import { ChainTypeEnum } from '@openfort/openfort-js'
import type React from 'react'
import { useEffect } from 'react'
import { ReceiveIcon, SendIcon, UserRoundIcon } from '../../../assets/icons'
import { useConnectedWallet } from '../../../hooks/useConnectedWallet'
import useLocales from '../../../hooks/useLocales'
import { useOpenfortCore } from '../../../openfort/useOpenfort'
import { useSolanaBalance } from '../../../solana/hooks/useSolanaBalance'
import { nFormatter, truncateSolanaAddress } from '../../../utils'
import Avatar from '../../Common/Avatar'
import Button from '../../Common/Button'
import { TextLinkButton } from '../../Common/Button/styles'
import { CopyText } from '../../Common/CopyToClipboard/CopyText'
import { ModalBody, ModalContent, ModalH1 } from '../../Common/Modal/styles'
import PoweredByFooter from '../../Common/PoweredByFooter'
import { useThemeContext } from '../../ConnectKitThemeProvider/ConnectKitThemeProvider'
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
  LinkedProvidersToggle,
  LoadingBalance,
} from './styles'

const SolanaConnected: React.FC = () => {
  const context = useOpenfort()
  const { setHeaderLeftSlot, setRoute } = context
  const locales = useLocales()

  const wallet = useConnectedWallet()
  const { embeddedAccounts } = useOpenfortCore()
  const hasSolanaWallets = (embeddedAccounts?.filter((a) => a.chainType === ChainTypeEnum.SVM) ?? []).length > 0
  const address = wallet.status === 'connected' ? wallet.address : undefined

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

  const themeContext = useThemeContext()
  const solanaUI = context.walletConfig?.solana?.ui
  const CustomAvatar = solanaUI?.customAvatar
  const separator = ['web95', 'rounded', 'minimal'].includes(themeContext.theme ?? context.uiConfig.theme ?? '')
    ? '....'
    : undefined

  return (
    <PageContent onBack={null} header={locales.profileScreen_heading}>
      <ModalContent style={{ paddingBottom: 6, gap: 6 }}>
        {address ? (
          <>
            <AvatarContainer>
              <AvatarInner>
                {CustomAvatar ? <CustomAvatar address={address} /> : <Avatar address={address} />}
              </AvatarInner>
            </AvatarContainer>
            <ModalH1>
              <CopyText value={address}>{truncateSolanaAddress(address, separator)}</CopyText>
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
                  <ActionButton icon={<SendIcon />} onClick={() => context.setRoute(routes.SOL_SEND)}>
                    Send
                  </ActionButton>
                  <ActionButton icon={<ReceiveIcon />} onClick={() => context.setRoute(routes.SOL_RECEIVE)}>
                    Get
                  </ActionButton>
                </ActionButtonsContainer>
              </ModalBody>
            )}
          </>
        ) : hasSolanaWallets ? (
          <Button onClick={() => setRoute(routes.SOL_WALLETS)}>Manage wallets</Button>
        ) : (
          <Button onClick={() => setRoute(routes.SOL_CREATE_WALLET)}>Create Solana Wallet</Button>
        )}
      </ModalContent>
      <PoweredByFooter />
    </PageContent>
  )
}

export default SolanaConnected
