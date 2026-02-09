import { useOpenfort } from '../components/Openfort/useOpenfort'
import { type OpenfortEVMBridgeConnector, useEVMBridge } from '../core/OpenfortEVMBridgeContext'
import { isCoinbaseWalletConnector, isInjectedConnector } from '../utils'
import { type WalletConfigProps, walletConfigs } from './walletConfigs'

export type WalletProps = {
  id: string
  connector: OpenfortEVMBridgeConnector
  isInstalled?: boolean
} & WalletConfigProps

/** Returns the list of EVM connectors (MetaMask, WalletConnect, etc.) for the connect UI. */
export function useEVMConnectors(): WalletProps[] {
  const bridge = useEVMBridge()
  const context = useOpenfort()

  if (!bridge) return []

  const wallets = bridge.connectors.map((connector): WalletProps => {
    const walletId = Object.keys(walletConfigs).find(
      (id) =>
        id
          .split(',')
          .map((i) => i.trim())
          .indexOf(connector.id) !== -1
    )

    const c: WalletProps = {
      id: connector.id,
      name: connector.name ?? connector.id ?? connector.type ?? '',
      icon: connector.icon ? (
        <img src={connector.icon} alt={connector.name} width={'100%'} height={'100%'} />
      ) : (
        <span style={{ width: '100%', height: '100%', background: 'var(--ck-body-background)', borderRadius: 4 }} />
      ),
      connector,
      iconShape: 'squircle',
      isInstalled:
        connector.type === 'mock' ||
        (connector.type === 'injected' && connector.id !== 'metaMask') ||
        isCoinbaseWalletConnector(connector.id),
    }

    if (walletId) {
      const wallet = walletConfigs[walletId]
      return {
        ...c,
        iconConnector: connector.icon ? (
          <img src={connector.icon} alt={connector.name} width={'100%'} height={'100%'} />
        ) : undefined,
        ...wallet,
      }
    }

    return c
  })

  return wallets
    .filter((wallet, index, self) => self.findIndex((w) => w.id === wallet.id) === index)
    .map((wallet) => {
      if (wallet.id === 'walletConnect') {
        return {
          ...wallet,
          name: context.uiConfig.walletConnectName || wallet.name,
          shortName: context.uiConfig.walletConnectName || wallet.shortName,
        }
      }
      return wallet
    })
    .filter(
      (wallet, _index, self) => !(wallet.id === 'coinbaseWalletSDK' && self.find((w) => w.id === 'com.coinbase.wallet'))
    )
    .filter(
      (wallet, _index, self) =>
        !(
          (wallet.id === 'metaMaskSDK' || wallet.id === 'metaMask') &&
          self.find((w) => w.id === 'io.metamask' || w.id === 'io.metamask.mobile')
        )
    )
    .sort((a, b) => {
      const AisInstalled = a.isInstalled && isInjectedConnector(a.connector.type)
      const BisInstalled = b.isInstalled && isInjectedConnector(b.connector.type)
      if (AisInstalled && !BisInstalled) return -1
      if (!AisInstalled && BisInstalled) return 1
      return 0
    })
    .sort((a, b) => {
      if (a.id === 'walletConnect') return 1
      if (b.id === 'walletConnect') return -1
      return 0
    })
}

/** Single connector by id. */
export const useWallet = (id: string): WalletProps | null => {
  const connectors = useEVMConnectors()
  const wallet = connectors.find((c) => c.id === id)
  if (!wallet) return null
  return wallet
}

/**
 * @deprecated Use useEVMConnectors() instead. Same return value (list of connectors for the connect UI).
 * useWallets() is different: it returns the user's wallets and actions (createWallet, setActiveWallet, etc.).
 */
export const useWagmiWallets = (): WalletProps[] => useEVMConnectors()
