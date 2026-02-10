import { ChainTypeEnum } from '@openfort/openfort-js'
import { useEffect, useState } from 'react'
import { embeddedWalletId } from '../../../constants/openfort'
import { useEthereumEmbeddedWallet } from '../../../ethereum/hooks/useEthereumEmbeddedWallet'
import type { ConnectedEmbeddedEthereumWallet } from '../../../ethereum/types'
import type { EthereumUserWallet } from '../../../hooks/openfort/useWallets'
import { useOpenfortCore } from '../../../openfort/useOpenfort'
import { useChain } from '../../../shared/hooks/useChain'
import { logger } from '../../../utils/logger'
import Loader from '../../Common/Loading'
import { routes } from '../../Openfort/types'
import { useOpenfort } from '../../Openfort/useOpenfort'
import { PageContent } from '../../PageContent'

function toUserWallet(w: ConnectedEmbeddedEthereumWallet): EthereumUserWallet {
  return {
    id: w.id,
    address: w.address,
    connectorType: 'embedded',
    walletClientType: 'openfort',
    isAvailable: true,
    accounts: [{ id: w.id }],
    recoveryMethod: w.recoveryMethod,
    ownerAddress: w.ownerAddress as EthereumUserWallet['ownerAddress'],
    implementationType: w.implementationType,
  }
}

const LoadWallets: React.FC = () => {
  const { chainType } = useChain()
  const { user, embeddedAccounts, isLoadingAccounts } = useOpenfortCore()
  const { triggerResize, setRoute, setConnector, walletConfig } = useOpenfort()
  const chainId = walletConfig?.ethereum?.chainId ?? 80002
  const ethereum = useEthereumEmbeddedWallet({ chainId })
  const [loadingUX, setLoadingUX] = useState(true)

  const isSolana = chainType === ChainTypeEnum.SVM
  const solanaWallets = (embeddedAccounts ?? []).filter((a) => a.chainType === ChainTypeEnum.SVM)
  const solanaLoading = isSolana && isLoadingAccounts

  const wallets = ethereum.wallets
  const isLoadingWallets =
    ethereum.status === 'fetching-wallets' || ethereum.status === 'connecting' || ethereum.status === 'creating'
  const errorWallets = ethereum.status === 'error' ? new Error(ethereum.error) : undefined

  useEffect(() => {
    let timeout: NodeJS.Timeout
    const loading = isSolana ? solanaLoading : isLoadingWallets
    if (!loading) {
      timeout = setTimeout(() => {
        setLoadingUX(false)
        triggerResize()
      }, 500)
    }
    return () => {
      clearTimeout(timeout)
    }
  }, [isSolana, solanaLoading, isLoadingWallets, triggerResize])

  useEffect(() => {
    if (loadingUX) return
    if (isSolana) {
      if (solanaLoading) return
      logger.log('Solana wallets loaded:', solanaWallets.length)
      if (solanaWallets.length > 1) {
        setRoute(routes.SELECT_WALLET_TO_RECOVER)
      } else {
        setRoute(routes.SOL_CONNECTED)
      }
      return
    }
    if (isLoadingWallets) return
    if (!wallets) {
      logger.error('Could not load wallets for user:', user)
      return
    }
    logger.log('User wallets loaded:', wallets)

    if (wallets.length === 0) {
      setRoute(routes.CREATE_WALLET)
      return
    }

    if (wallets.length === 1) {
      const w = wallets[0]
      const walletForRoute = toUserWallet(w)
      if (w.id === embeddedWalletId) {
        setRoute({ route: routes.RECOVER_WALLET, wallet: walletForRoute })
      } else {
        setRoute({ route: routes.CONNECT, connectType: 'recover', wallet: walletForRoute })
        setConnector({ id: w.id })
      }
      return
    }

    setRoute(routes.SELECT_WALLET_TO_RECOVER)
  }, [
    loadingUX,
    isSolana,
    solanaLoading,
    solanaWallets.length,
    isLoadingWallets,
    wallets,
    user,
    setRoute,
    setConnector,
  ])

  const isError = !user || (isSolana ? false : !!errorWallets)
  const errorMessage =
    !isSolana && errorWallets ? errorWallets.message || 'There was an error loading wallets' : undefined

  return (
    <PageContent onBack={!user ? 'back' : null}>
      <Loader
        header="Setting up wallet"
        isError={isError}
        description={isError ? errorMessage : 'Setting up wallets'}
      />
    </PageContent>
  )
}

export default LoadWallets
