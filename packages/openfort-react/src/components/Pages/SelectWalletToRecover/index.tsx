import type { EmbeddedAccount } from '@openfort/openfort-js'
import { ChainTypeEnum, RecoveryMethod } from '@openfort/openfort-js'

import { FingerPrintIcon, KeyIcon, LockIcon } from '../../../assets/icons'
import { embeddedWalletId } from '../../../constants/openfort'
import { useEthereumEmbeddedWallet } from '../../../ethereum/hooks/useEthereumEmbeddedWallet'
import type { ConnectedEmbeddedEthereumWallet } from '../../../ethereum/types'
import { type EthereumUserWallet, embeddedAccountToSolanaUserWallet } from '../../../hooks/openfort/useWallets'
import { useResolvedIdentity } from '../../../hooks/useResolvedIdentity'
import { useOpenfortCore } from '../../../openfort/useOpenfort'
import { useChain } from '../../../shared/hooks/useChain'
import { truncateEthAddress } from '../../../utils'
import { walletConfigs } from '../../../wallets/walletConfigs'
import Button from '../../Common/Button'
import { ModalHeading } from '../../Common/Modal/styles'
import { routes } from '../../Openfort/types'
import { useOpenfort } from '../../Openfort/useOpenfort'
import { PageContent } from '../../PageContent'
import { ProviderIcon, ProviderLabel, ProvidersButton } from '../Providers/styles'

function asEthereumUserWallet(w: ConnectedEmbeddedEthereumWallet): EthereumUserWallet {
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

/** EVM: one wallet row; converts to EthereumUserWallet for routes. */
const EVMWalletButton = ({ wallet }: { wallet: ConnectedEmbeddedEthereumWallet }) => {
  const { chainType } = useChain()
  const identity = useResolvedIdentity({
    address: wallet.address,
    chainType,
    enabled: !!wallet.address,
  })
  const ensName = identity.status === 'success' ? identity.name : undefined
  const walletDisplay = ensName ?? truncateEthAddress(wallet.address)
  const { setRoute, setConnector } = useOpenfort()

  const walletIcon = () => {
    if (wallet.id === embeddedWalletId) {
      return <WalletRecoveryIcon recovery={wallet.recoveryMethod} />
    }
    const walletConfig = Object.entries(walletConfigs).find(([key]) => key.includes(wallet.id))?.[1]
    if (walletConfig) return walletConfig.icon
  }

  return (
    <ProvidersButton>
      <Button
        onClick={() => {
          const walletForRoute = asEthereumUserWallet(wallet)
          if (wallet.id === embeddedWalletId) {
            setRoute({ route: routes.RECOVER_WALLET, wallet: walletForRoute })
          } else {
            setRoute({ route: routes.CONNECT, connectType: 'recover', wallet: walletForRoute })
            setConnector({ id: wallet.id })
          }
        }}
      >
        <ProviderLabel>{walletDisplay}</ProviderLabel>
        <ProviderIcon>{walletIcon()}</ProviderIcon>
      </Button>
    </ProvidersButton>
  )
}

/** Solana: one wallet row; uses SolanaUserWallet for routes. Always route to SOL_RECOVER_WALLET (not EVM CONNECT). */
const SolanaWalletButton = ({ account }: { account: EmbeddedAccount }) => {
  const { setRoute } = useOpenfort()
  const walletForRoute = embeddedAccountToSolanaUserWallet(account)
  const display =
    account.address.length > 12 ? `${account.address.slice(0, 4)}...${account.address.slice(-4)}` : account.address

  const walletIcon = () => {
    if (account.id === embeddedWalletId) {
      return <WalletRecoveryIcon recovery={account.recoveryMethod} />
    }
    return null
  }

  return (
    <ProvidersButton>
      <Button
        onClick={() => {
          setRoute({ route: routes.SOL_RECOVER_WALLET, wallet: walletForRoute })
        }}
      >
        <ProviderLabel>{display}</ProviderLabel>
        <ProviderIcon>{walletIcon()}</ProviderIcon>
      </Button>
    </ProvidersButton>
  )
}

export default function SelectWalletToRecover() {
  const { chainType } = useChain()
  const { walletConfig } = useOpenfort()
  const { embeddedAccounts } = useOpenfortCore()
  const chainId = walletConfig?.ethereum?.chainId ?? 80002
  const { wallets: evmWallets } = useEthereumEmbeddedWallet({ chainId })

  const isSolana = chainType === ChainTypeEnum.SVM
  const solanaWallets = (embeddedAccounts ?? []).filter((a) => a.chainType === ChainTypeEnum.SVM)

  const list = isSolana
    ? solanaWallets.map((account) => <SolanaWalletButton key={account.id} account={account} />)
    : evmWallets.map((wallet) => <EVMWalletButton key={wallet.address} wallet={wallet} />)

  return (
    <PageContent onBack={routes.PROVIDERS} logoutOnBack>
      <ModalHeading>Select a wallet to recover</ModalHeading>
      {list}
    </PageContent>
  )
}
