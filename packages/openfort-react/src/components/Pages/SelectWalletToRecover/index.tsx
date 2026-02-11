import { ChainTypeEnum, RecoveryMethod } from '@openfort/openfort-js'
import { FingerPrintIcon, KeyIcon, LockIcon } from '../../../assets/icons'
import { embeddedWalletId } from '../../../constants/openfort'
import type { ConnectedEmbeddedEthereumWallet } from '../../../ethereum/types'
import type { EthereumUserWallet, SolanaUserWallet } from '../../../hooks/openfort/useWallets'
import { useEmbeddedWallet } from '../../../hooks/useEmbeddedWallet'
import { useResolvedIdentity } from '../../../hooks/useResolvedIdentity'
import { useChain } from '../../../shared/hooks/useChain'
import type { ConnectedEmbeddedSolanaWallet } from '../../../solana/types'
import { truncateEthAddress } from '../../../utils'
import { walletConfigs } from '../../../wallets/walletConfigs'
import Button from '../../Common/Button'
import { ModalHeading } from '../../Common/Modal/styles'
import { externalWalletRecoverRoute, recoverRoute } from '../../Openfort/routeHelpers'
import { routes } from '../../Openfort/types'
import { useOpenfort } from '../../Openfort/useOpenfort'
import { PageContent } from '../../PageContent'
import { ProviderIcon, ProviderLabel, ProvidersButton } from '../Providers/styles'

function toEthereumUserWallet(w: ConnectedEmbeddedEthereumWallet): EthereumUserWallet {
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

function toSolanaUserWallet(w: ConnectedEmbeddedSolanaWallet): SolanaUserWallet {
  return {
    id: w.id,
    address: w.address,
    chainType: ChainTypeEnum.SVM,
    isAvailable: true,
    accounts: [{ id: w.id }],
    recoveryMethod: w.recoveryMethod,
  }
}

const WalletRecoveryIcon = ({ recovery }: { recovery: RecoveryMethod | undefined }) => {
  switch (recovery) {
    case RecoveryMethod.PASSWORD:
      return <KeyIcon />
    case RecoveryMethod.PASSKEY:
      return <FingerPrintIcon />
    case RecoveryMethod.AUTOMATIC:
      return <LockIcon />
    default:
      return null
  }
}

function WalletRow({
  chainType,
  wallet,
}: {
  chainType: ChainTypeEnum
  wallet: ConnectedEmbeddedEthereumWallet | ConnectedEmbeddedSolanaWallet
}) {
  const { setRoute, setConnector } = useOpenfort()
  const identity = useResolvedIdentity({
    address: wallet.address,
    chainType,
    enabled: !!wallet.address,
  })
  const display =
    chainType === ChainTypeEnum.SVM
      ? wallet.address.length > 12
        ? `${wallet.address.slice(0, 4)}...${wallet.address.slice(-4)}`
        : wallet.address
      : identity.status === 'success'
        ? (identity.name ?? truncateEthAddress(wallet.address))
        : truncateEthAddress(wallet.address)

  const walletIcon = () => {
    if (wallet.id === embeddedWalletId) {
      return <WalletRecoveryIcon recovery={wallet.recoveryMethod} />
    }
    if (chainType === ChainTypeEnum.EVM) {
      const walletConfig = Object.entries(walletConfigs).find(([key]) => key.includes(wallet.id))?.[1]
      if (walletConfig) return walletConfig.icon
    }
    return null
  }

  const handleClick = () => {
    if (chainType === ChainTypeEnum.SVM) {
      const walletForRoute = toSolanaUserWallet(wallet as ConnectedEmbeddedSolanaWallet)
      setRoute(recoverRoute(chainType, walletForRoute))
      return
    }
    const walletForRoute = toEthereumUserWallet(wallet as ConnectedEmbeddedEthereumWallet)
    if (wallet.id === embeddedWalletId) {
      setRoute(recoverRoute(chainType, walletForRoute))
    } else {
      const externalRoute = externalWalletRecoverRoute(chainType, walletForRoute)
      if (externalRoute) {
        setRoute(externalRoute)
        setConnector({ id: wallet.id })
      }
    }
  }

  return (
    <ProvidersButton>
      <Button onClick={handleClick}>
        <ProviderLabel>{display}</ProviderLabel>
        <ProviderIcon>{walletIcon()}</ProviderIcon>
      </Button>
    </ProvidersButton>
  )
}

export default function SelectWalletToRecover() {
  const { chainType } = useChain()
  const embeddedWallet = useEmbeddedWallet()
  const wallets = embeddedWallet.wallets

  const list = wallets.map((wallet) => <WalletRow key={wallet.id} chainType={chainType} wallet={wallet} />)

  return (
    <PageContent onBack={routes.PROVIDERS} logoutOnBack>
      <ModalHeading>Select a wallet to recover</ModalHeading>
      {list}
    </PageContent>
  )
}
