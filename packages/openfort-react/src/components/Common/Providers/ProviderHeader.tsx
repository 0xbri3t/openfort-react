import { useEffect, useState } from 'react'
import type { Hex } from 'viem'
import { useEVMBridge } from '../../../core/OpenfortEVMBridgeContext'
import { useUser } from '../../../hooks/openfort/useUser'
import type { UserAccount } from '../../../openfortCustomTypes'
import { truncateEthAddress } from '../../../utils'
import { useThemeContext } from '../../ConnectKitThemeProvider/ConnectKitThemeProvider'
import { useOpenfort } from '../../Openfort/useOpenfort'
import { LinkedProviderText } from '../../Pages/LinkedProviders/styles'

export const WalletDisplay = ({ walletAddress }: { walletAddress: string }) => {
  const bridge = useEVMBridge()
  const [ensName, setEnsName] = useState<string | undefined>(undefined)
  const context = useOpenfort()
  const themeContext = useThemeContext()

  useEffect(() => {
    if (!bridge?.getEnsName || !walletAddress) return
    bridge.getEnsName({ address: walletAddress as Hex }).then(setEnsName)
  }, [bridge, walletAddress])

  const separator = ['web95', 'rounded', 'minimal'].includes(themeContext.theme ?? context.uiConfig.theme ?? '')
    ? '....'
    : undefined

  return ensName ?? truncateEthAddress(walletAddress, separator)
}

export const ProviderHeader: React.FC<{ provider: UserAccount }> = ({ provider }) => {
  const { user } = useUser()
  switch (provider.provider) {
    case 'wallet':
    case 'siwe':
      return (
        <LinkedProviderText>
          <WalletDisplay walletAddress={provider.accountId!} />
        </LinkedProviderText>
      )
    case 'phone':
      return <LinkedProviderText>{provider.accountId}</LinkedProviderText>
    default:
      return (
        <LinkedProviderText style={{ textTransform: user?.email ? 'none' : 'capitalize' }}>
          {user?.email ?? provider.provider}
        </LinkedProviderText>
      )
  }
}
