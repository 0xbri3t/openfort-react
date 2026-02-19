import { ChainTypeEnum } from '@openfort/openfort-js'
import type React from 'react'
import { DisconnectIcon } from '../../../assets/icons'
import { useEthereumEmbeddedWallet } from '../../../ethereum/hooks/useEthereumEmbeddedWallet'
import { useChainIsSupported } from '../../../hooks/useChainIsSupported'
import useLocales from '../../../hooks/useLocales'
import { useOpenfortCore } from '../../../openfort/useOpenfort'
import { useChain } from '../../../shared/hooks/useChain'
import { useSolanaEmbeddedWallet } from '../../../solana/hooks/useSolanaEmbeddedWallet'
import Button from '../../Common/Button'
import ChainSelectList from '../../Common/ChainSelectList'
import { OrDivider } from '../../Common/Modal'
import { ModalBody, ModalContent } from '../../Common/Modal/styles'
import { PageContent } from '../../PageContent'

const SwitchNetworks: React.FC = () => {
  const { logout } = useOpenfortCore()
  const { chainType } = useChain()

  // Use chain-specific hooks
  const ethereumWallet = useEthereumEmbeddedWallet()
  const solanaWallet = useSolanaEmbeddedWallet()
  const wallet = chainType === ChainTypeEnum.EVM ? ethereumWallet : solanaWallet

  const isConnected = wallet.status === 'connected'
  const chainId = isConnected && chainType === ChainTypeEnum.EVM ? (wallet as typeof ethereumWallet).chainId : undefined
  const isChainSupported = useChainIsSupported(chainId)

  const locales = useLocales({})

  const onDisconnect = () => {
    logout()
  }

  return (
    <PageContent width={278}>
      <ModalContent style={{ padding: 0, marginTop: -10 }}>
        {!isChainSupported && (
          <ModalBody>
            {locales.warnings_chainUnsupported} {locales.warnings_chainUnsupportedResolve}
          </ModalBody>
        )}

        <div style={{ padding: '6px 8px' }}>
          <ChainSelectList variant="secondary" />
        </div>

        {!isChainSupported && (
          <div style={{ paddingTop: 12 }}>
            <OrDivider />
            <Button icon={<DisconnectIcon />} variant="secondary" onClick={onDisconnect}>
              {locales.disconnect}
            </Button>
          </div>
        )}
      </ModalContent>
    </PageContent>
  )
}

export default SwitchNetworks
