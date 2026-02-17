import { ChainTypeEnum } from '@openfort/openfort-js'
import { PlusIcon } from '../../../assets/icons'
import { toSolanaUserWallet } from '../../../hooks/openfort/walletConverters'
import { useChain } from '../../../shared/hooks/useChain'
import { useSolanaEmbeddedWallet } from '../../../solana/hooks/useSolanaEmbeddedWallet'
import type { ConnectedEmbeddedSolanaWallet } from '../../../solana/types'
import Button from '../../Common/Button'
import { ModalBody, ModalHeading } from '../../Common/Modal/styles'
import { WalletRecoveryIcon } from '../../Common/WalletRecoveryIcon'
import { recoverRoute } from '../../Openfort/routeHelpers'
import { routes } from '../../Openfort/types'
import { useOpenfort } from '../../Openfort/useOpenfort'
import { PageContent } from '../../PageContent'
import { ProviderIcon, ProviderLabel, ProvidersButton } from '../Providers/styles'

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
  const embeddedWallet = useSolanaEmbeddedWallet()
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
