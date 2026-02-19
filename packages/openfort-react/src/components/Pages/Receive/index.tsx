import { ChainTypeEnum } from '@openfort/openfort-js'
import Logos from '../../../assets/logos'
import { useEthereumEmbeddedWallet } from '../../../ethereum/hooks/useEthereumEmbeddedWallet'
import { useChains } from '../../../hooks/useChains'
import { useChain } from '../../../shared/hooks/useChain'
import { useSolanaEmbeddedWallet } from '../../../solana/hooks/useSolanaEmbeddedWallet'
import { CopyIconButton } from '../../Common/CopyToClipboard/CopyIconButton'
import CustomQRCode from '../../Common/CustomQRCode'
import { ModalBody, ModalHeading } from '../../Common/Modal/styles'
import { routes } from '../../Openfort/types'
import { useOpenfort } from '../../Openfort/useOpenfort'
import { PageContent } from '../../PageContent'
import { AddressField, AddressRow, AddressSection, Label, NetworkInfo, QRWrapper } from './styles'

function formatSolanaCluster(cluster: string): string {
  if (cluster === 'mainnet-beta') return 'Mainnet'
  return cluster.charAt(0).toUpperCase() + cluster.slice(1)
}

const Receive = () => {
  const context = useOpenfort()
  const currentRoute = context.route?.route ?? ''
  const isSolanaRoute = currentRoute.startsWith('sol:')
  const { chainType } = useChain()
  const ethereumWallet = useEthereumEmbeddedWallet()
  const solanaWallet = useSolanaEmbeddedWallet()
  const wallet = chainType === ChainTypeEnum.EVM ? ethereumWallet : solanaWallet

  const chains = useChains()

  const isConnected = wallet.status === 'connected'
  const address = isConnected ? wallet.address : undefined
  const chainId = isConnected && chainType === ChainTypeEnum.EVM ? (wallet as typeof ethereumWallet).chainId : undefined
  const chain = chains.find((c) => c.id === chainId)

  const qrValue = address || ''

  const networkLabel =
    isConnected && chainType === ChainTypeEnum.SVM && solanaWallet.cluster
      ? formatSolanaCluster(solanaWallet.cluster)
      : chain?.name
        ? `${chain.name}${chainId ? ` · Chain ID: ${chainId}` : ''}`
        : chainId
          ? `Chain ID: ${chainId}`
          : null

  const { uiConfig: options } = context
  const renderLogo = () => {
    if (options?.logo) {
      if (typeof options.logo === 'string') {
        return <img src={options.logo} alt="Logo" style={{ width: '100%' }} />
      }
      return options.logo
    }
    return <Logos.Openfort />
  }

  return (
    <PageContent onBack={isSolanaRoute ? routes.SOL_CONNECTED : routes.CONNECTED}>
      <ModalHeading>Receive funds</ModalHeading>
      <ModalBody>Scan the QR code or copy your wallet details.</ModalBody>

      {address && (
        <QRWrapper>
          <CustomQRCode value={qrValue} image={<div style={{ padding: 10 }}>{renderLogo()}</div>} />
        </QRWrapper>
      )}

      <AddressSection>
        <Label>Your wallet address</Label>
        <AddressRow>
          <AddressField>{address ?? '--'}</AddressField>
          <CopyIconButton value={address ?? ''} />
        </AddressRow>
      </AddressSection>

      {networkLabel && <NetworkInfo>Network: {networkLabel}</NetworkInfo>}
    </PageContent>
  )
}

export default Receive
