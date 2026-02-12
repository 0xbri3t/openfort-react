import { useEffect, useState } from 'react'
import type { Hex } from 'viem'
import { useConnectionStrategy } from '../../../core/ConnectionStrategyContext'
import { useEVMBridge } from '../../../core/OpenfortEVMBridgeContext'
import { useUser } from '../../../hooks/openfort/useUser'
import type { UserAccount } from '../../../openfortCustomTypes'
import { truncateEthAddress } from '../../../utils'
import { useThemeContext } from '../../ConnectKitThemeProvider/ConnectKitThemeProvider'
import { useOpenfort } from '../../Openfort/useOpenfort'
import { LinkedProviderText } from '../../Pages/LinkedProviders/styles'

export const WalletDisplay = ({ walletAddress }: { walletAddress: string }) => {
  const strategy = useConnectionStrategy()
  const bridge = useEVMBridge()
  const [ensName, setEnsName] = useState<string | undefined>(undefined)
  const context = useOpenfort()
  const themeContext = useThemeContext()
  // Only resolve ENS on mainnet (1); testnets throw "network does not support ENS"
  const useEns = strategy?.kind === 'bridge' && !!bridge?.getEnsName && (bridge.chainId ?? 0) === 1

  useEffect(() => {
    if (!useEns || !walletAddress || !bridge?.getEnsName) return
    bridge
      .getEnsName({ address: walletAddress as Hex })
      .then(setEnsName)
      .catch(() => {})
  }, [useEns, bridge, walletAddress])

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
