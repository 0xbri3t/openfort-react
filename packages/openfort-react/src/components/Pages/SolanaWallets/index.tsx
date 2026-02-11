import { ChainTypeEnum, RecoveryMethod } from '@openfort/openfort-js'
import { FingerPrintIcon, KeyIcon, LockIcon, PlusIcon } from '../../../assets/icons'
import type { SolanaUserWallet } from '../../../hooks/openfort/useWallets'
import { useEmbeddedWallet } from '../../../hooks/useEmbeddedWallet'
import { useChain } from '../../../shared/hooks/useChain'
import type { ConnectedEmbeddedSolanaWallet } from '../../../solana/types'
import Button from '../../Common/Button'
import { ModalBody, ModalHeading } from '../../Common/Modal/styles'
import { recoverRoute } from '../../Openfort/routeHelpers'
import { routes } from '../../Openfort/types'
import { useOpenfort } from '../../Openfort/useOpenfort'
import { PageContent } from '../../PageContent'
import { ProviderIcon, ProviderLabel, ProvidersButton } from '../Providers/styles'

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

function WalletRow({ wallet }: { wallet: ConnectedEmbeddedSolanaWallet }) {
  const { setRoute } = useOpenfort()
  const { chainType } = useChain()
  const display =
    wallet.address.length > 12 ? `${wallet.address.slice(0, 4)}...${wallet.address.slice(-4)}` : wallet.address

  const handleClick = () => {
    const walletForRoute = toSolanaUserWallet(wallet)
    setRoute(recoverRoute(chainType, walletForRoute))
  }

  return (
    <ProvidersButton>
      <Button onClick={handleClick}>
        <ProviderLabel>{display}</ProviderLabel>
        <ProviderIcon>
          <WalletRecoveryIcon recovery={wallet.recoveryMethod} />
        </ProviderIcon>
      </Button>
    </ProvidersButton>
  )
}

export default function SolanaWallets() {
  const { setRoute } = useOpenfort()
  const embeddedWallet = useEmbeddedWallet()
  const wallets = embeddedWallet.wallets ?? []
  const solanaWallets = wallets.filter((w) => w.chainType === ChainTypeEnum.SVM)

  return (
    <PageContent onBack={routes.SOL_CONNECTED}>
      <ModalHeading>Solana Wallets</ModalHeading>
      <ModalBody>
        {solanaWallets.map((wallet) => (
          <WalletRow key={wallet.id} wallet={wallet as ConnectedEmbeddedSolanaWallet} />
        ))}
        <ProvidersButton>
          <Button
            onClick={() => setRoute(routes.SOL_CREATE_WALLET)}
            icon={
              <ProviderIcon>
                <PlusIcon />
              </ProviderIcon>
            }
          >
            <ProviderLabel>Create new wallet</ProviderLabel>
          </Button>
        </ProvidersButton>
      </ModalBody>
    </PageContent>
  )
}
