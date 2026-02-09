/**
 * @deprecated This component requires wagmi and will be moved to @openfort/wagmi in v3.0.
 * For embedded wallets, external wallet connections are not needed.
 * This component is only used for connecting external wallets via WalletConnect.
 */
import { useEffect, useState } from 'react'
import { useEVMBridge } from '../../../core/OpenfortEVMBridgeContext'
import useIsMobile from '../../../hooks/useIsMobile'
import { useWalletConnectModal } from '../../../hooks/useWalletConnectModal'
import { logger } from '../../../utils/logger'
import ConnectorList from '../../Common/ConnectorList'
import Loader from '../../Common/Loading'
import { routes } from '../../Openfort/types'
import { useOpenfort } from '../../Openfort/useOpenfort'
import { PageContent } from '../../PageContent'

let hasWarnedConnectors = false

const ConnectWithMobile = () => {
  const { open: openWalletConnectModal } = useWalletConnectModal()
  const [error, setError] = useState<string | undefined>(undefined)
  const bridge = useEVMBridge()
  const connector = bridge?.account?.connector
  const address = bridge?.account?.address
  const { setRoute, setConnector } = useOpenfort()

  const openWCModal = async () => {
    setError(undefined)
    const { error } = await openWalletConnectModal()
    if (error) {
      setError(error)
    }
  }

  useEffect(() => {
    openWCModal()
  }, [])

  useEffect(() => {
    if (connector && address) {
      const walletConnectDeeplinkChoice = localStorage.getItem('WALLETCONNECT_DEEPLINK_CHOICE')

      if (walletConnectDeeplinkChoice) {
        const parsedChoice: { href: string; name: string } = JSON.parse(walletConnectDeeplinkChoice)
        setConnector({ id: parsedChoice.name })
      } else {
        setConnector({ id: connector.id })
      }

      setRoute(routes.CONNECT_WITH_MOBILE)
    }
  }, [address, connector])

  return (
    <Loader
      header={error ? 'Error connecting wallet.' : `Connecting...`}
      isError={!!error}
      description={error}
      onRetry={() => openWCModal()}
    />
  )
}

const Connectors = ({ logoutOnBack }: { logoutOnBack?: boolean }) => {
  const isMobile = useIsMobile()

  // Runtime deprecation warning
  if (process.env.NODE_ENV === 'development' && !hasWarnedConnectors) {
    logger.warn(
      '[@openfort/react] <Connectors /> is deprecated and will be moved to @openfort/wagmi in v3.0.\n' +
        'For embedded wallets, external wallet connections are not needed.\n' +
        'See: https://openfort.io/docs/migration/external-wallets'
    )
    hasWarnedConnectors = true
  }

  return (
    <PageContent logoutOnBack={logoutOnBack} width={312}>
      {isMobile ? <ConnectWithMobile /> : <ConnectorList />}
    </PageContent>
  )
}

export default Connectors
