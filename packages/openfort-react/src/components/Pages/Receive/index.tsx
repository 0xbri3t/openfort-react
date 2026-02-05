import Logos from '../../../assets/logos'
import { useChains } from '../../../hooks/useChains'
import { useConnectedWallet } from '../../../hooks/useConnectedWallet'
import { CopyIconButton } from '../../Common/CopyToClipboard/CopyIconButton'
import CustomQRCode from '../../Common/CustomQRCode'
import { ModalBody, ModalHeading } from '../../Common/Modal/styles'
import { routes } from '../../Openfort/types'
import { useOpenfort } from '../../Openfort/useOpenfort'
import { PageContent } from '../../PageContent'
import { AddressField, AddressRow, AddressSection, Label, NetworkInfo, QRWrapper } from './styles'

const Receive = () => {
  // Use new abstraction hooks (no wagmi)
  const wallet = useConnectedWallet()
  const chains = useChains()

  const isConnected = wallet.status === 'connected'
  const address = isConnected ? wallet.address : undefined
  const chainId = isConnected ? wallet.chainId : undefined
  const chain = chains.find((c) => c.id === chainId)

  const qrValue = address || ''

  const networkLabel = chain?.name
    ? `${chain.name}${chainId ? ` · Chain ID: ${chainId}` : ''}`
    : chainId
      ? `Chain ID: ${chainId}`
      : null

  const { uiConfig: options } = useOpenfort()
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
    <PageContent onBack={routes.CONNECTED}>
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
