import { ChainTypeEnum } from '@openfort/openfort-js'
import { useEffect, useState } from 'react'
import { embeddedWalletId } from '../../../constants/openfort'
import { useEthereumEmbeddedWallet } from '../../../ethereum/hooks/useEthereumEmbeddedWallet'
import type { ConnectedEmbeddedEthereumWallet } from '../../../ethereum/types'
import { toEthereumUserWallet, toSolanaUserWallet } from '../../../hooks/openfort/walletConverters'
import { useOpenfortCore } from '../../../openfort/useOpenfort'
import { useChain } from '../../../shared/hooks/useChain'
import { useSolanaEmbeddedWallet } from '../../../solana/hooks/useSolanaEmbeddedWallet'
import type { ConnectedEmbeddedSolanaWallet } from '../../../solana/types'
import { logger } from '../../../utils/logger'
import Loader from '../../Common/Loading'
import { createRoute, externalWalletRecoverRoute, recoverRoute } from '../../Openfort/routeHelpers'
import { routes } from '../../Openfort/types'
import { useOpenfort } from '../../Openfort/useOpenfort'
import { PageContent } from '../../PageContent'

type SingleWalletHandler = (
  w: ConnectedEmbeddedEthereumWallet | ConnectedEmbeddedSolanaWallet,
  chainType: ChainTypeEnum,
  setRoute: (opts: ReturnType<typeof recoverRoute>) => void,
  setConnector: (c: { id: string }) => void
) => void

const handleSingleWalletRegistry: Record<ChainTypeEnum.EVM | ChainTypeEnum.SVM, SingleWalletHandler> = {
  [ChainTypeEnum.SVM]: (w, chainType, setRoute) => {
    const walletForRoute = toSolanaUserWallet(w as ConnectedEmbeddedSolanaWallet)
    setRoute(recoverRoute(chainType, walletForRoute))
  },
  [ChainTypeEnum.EVM]: (w, chainType, setRoute, setConnector) => {
    const walletForRoute = toEthereumUserWallet(w as ConnectedEmbeddedEthereumWallet)
    if (w.id === embeddedWalletId) {
      setRoute(recoverRoute(chainType, walletForRoute))
    } else {
      const externalRoute = externalWalletRecoverRoute(chainType, walletForRoute)
      if (externalRoute) {
        setRoute(externalRoute)
        setConnector({ id: w.id })
      }
    }
  },
}

const errorForChainRegistry: Record<
  ChainTypeEnum.EVM | ChainTypeEnum.SVM,
  (errorWallets: Error | undefined) => { isError: boolean; message: string | undefined }
> = {
  [ChainTypeEnum.SVM]: () => ({ isError: false, message: undefined }),
  [ChainTypeEnum.EVM]: (errorWallets) => ({
    isError: !!errorWallets,
    message: errorWallets?.message || 'There was an error loading wallets',
  }),
}

const LoadWallets: React.FC = () => {
  const { chainType } = useChain()
  const { user } = useOpenfortCore()
  const { triggerResize, setRoute, setConnector } = useOpenfort()
  const ethereumWallet = useEthereumEmbeddedWallet()
  const solanaWallet = useSolanaEmbeddedWallet()
  const embeddedWallet = chainType === ChainTypeEnum.EVM ? ethereumWallet : solanaWallet

  const [loadingUX, setLoadingUX] = useState(true)

  const wallets = embeddedWallet.wallets
  const isLoadingWallets =
    embeddedWallet.status === 'fetching-wallets' ||
    embeddedWallet.status === 'connecting' ||
    embeddedWallet.status === 'creating'
  const errorWallets = embeddedWallet.status === 'error' ? new Error(embeddedWallet.error) : undefined

  useEffect(() => {
    let timeout: NodeJS.Timeout
    if (!isLoadingWallets) {
      timeout = setTimeout(() => {
        setLoadingUX(false)
        triggerResize()
      }, 500)
    }
    return () => clearTimeout(timeout)
  }, [isLoadingWallets, triggerResize])

  useEffect(() => {
    if (loadingUX) return
    if (isLoadingWallets) return
    if (!wallets) {
      logger.error('Could not load wallets for user:', user)
      return
    }
    logger.log('User wallets loaded:', wallets.length)

    if (wallets.length === 0) {
      setRoute(createRoute(chainType))
      return
    }

    if (wallets.length === 1) {
      handleSingleWalletRegistry[chainType](wallets[0], chainType, setRoute, setConnector)
      return
    }

    setRoute(routes.SELECT_WALLET_TO_RECOVER)
  }, [loadingUX, isLoadingWallets, wallets, user, chainType, setRoute, setConnector])

  const { isError: isErrorFromChain, message: errorMessageFromChain } = errorForChainRegistry[chainType](errorWallets)
  const isError = !user || isErrorFromChain
  const errorMessage = !user ? undefined : errorMessageFromChain

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
