import React, { useEffect } from 'react'

import { useAuthContext } from '../../../core/AuthContext'
import { useConnectedWallet } from '../../../hooks/useConnectedWallet'
import Loader from '../../Common/Loading'
import { routes } from '../../Openfort/types'
import { useOpenfort } from '../../Openfort/useOpenfort'
import { PageContent } from '../../PageContent'

const Loading: React.FC = () => {
  const { setRoute, walletConfig } = useOpenfort()
  const { user, isLoadingAccounts, needsRecovery } = useAuthContext()

  // Use new abstraction hooks (no wagmi)
  const wallet = useConnectedWallet()
  const isConnected = wallet.status === 'connected'
  const address = isConnected ? wallet.address : undefined

  const [isFirstFrame, setIsFirstFrame] = React.useState(true)
  const [retryCount, setRetryCount] = React.useState(0)

  useEffect(() => {
    if (isFirstFrame) return

    if (isLoadingAccounts) return
    else if (!user) setRoute(routes.PROVIDERS)
    else if (!address) {
      if (!walletConfig) setRoute({ route: routes.CONNECTORS, connectType: 'connect' })
      else setRoute(routes.LOAD_WALLETS)
    } else if (needsRecovery) {
      if (!walletConfig) setRoute({ route: routes.CONNECTORS, connectType: 'connect' })
      else setRoute(routes.LOAD_WALLETS)
    } else setRoute(routes.CONNECTED)
  }, [isLoadingAccounts, user, address, needsRecovery, isFirstFrame, retryCount])

  // Retry every 250ms
  useEffect(() => {
    const interval = setInterval(() => {
      setRetryCount((r) => r + 1)
    }, 250)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    // UX: Wait a bit before showing the next page
    setTimeout(() => setIsFirstFrame(false), 400)
  }, [])

  return (
    <PageContent>
      <Loader header="Redirecting" />
    </PageContent>
  )
}

export default Loading
