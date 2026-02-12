import { embeddedWalletId, useConnectedWallet, useEmbeddedWallet, useEthereumBridge } from '@openfort/react'
import type React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/cn'

/** Known wallet logo URLs for connectors that may not provide icon */
const WALLET_LOGOS: Record<string, string> = {
  metaMask: 'https://token.metamask.io/favicon.svg',
  'io.metamask': 'https://token.metamask.io/favicon.svg',
  injected: 'https://token.metamask.io/favicon.svg',
  walletConnect: 'https://raw.githubusercontent.com/WalletConnect/.github/main/Logo.svg',
  coinbaseWalletSDK: 'https://www.coinbase.com/favicon.ico',
  'com.coinbase.wallet': 'https://www.coinbase.com/favicon.ico',
  coinbaseWallet: 'https://www.coinbase.com/favicon.ico',
  braveWallet: 'https://brave.com/next/assets/favicon.ico',
}

function getConnectorIconUrl(connector: { id: string; icon?: string }): string | undefined {
  if (connector.icon && typeof connector.icon === 'string') return connector.icon
  const key = Object.keys(WALLET_LOGOS).find((k) => connector.id.includes(k) || connector.id === k)
  return key ? WALLET_LOGOS[key] : undefined
}

/**
 * Switch between Openfort embedded wallet and external wallets.
 * Uses `useConnectedWallet()` from the SDK for wallet-type detection — no manual
 * connector matching or transition-flag juggling needed.
 */
export const ConnectExternalWalletCard = () => {
  const wallet = useConnectedWallet()
  const bridge = useEthereumBridge()
  const embedded = useEmbeddedWallet()
  const externalWallets = bridge?.connectors ?? []

  // SDK gives us clean booleans — no need for manual wagmi state inspection
  const isOpenfortActive = wallet.isConnected && wallet.isEmbedded
  const isExternalActive = wallet.isConnected && wallet.isExternal
  const isSwitching = wallet.isConnecting

  const handleSwitchToOpenfort = () => {
    if (!isOpenfortActive) {
      const openfortConnector = bridge?.connectors.find((c) => c.id === embeddedWalletId)
      if (openfortConnector) {
        bridge?.connect({ connector: openfortConnector })
      } else if (embedded.wallets?.length) {
        embedded.setActive?.({ address: embedded.wallets[0].address })?.catch(() => {})
      }
    }
  }

  const handleConnectExternal = (c: (typeof externalWallets)[number]) => {
    bridge?.connect({ connector: c })
  }

  const WalletButton = ({
    children,
    isActive,
    disabled,
    onClick,
  }: {
    children: React.ReactNode
    isActive: boolean
    disabled?: boolean
    onClick: () => void
  }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'w-full flex items-center justify-start gap-3 py-2 px-3 rounded-md text-sm transition-colors',
        isActive
          ? 'bg-base-300/80 text-foreground'
          : 'hover:bg-base-300/50 text-muted-foreground hover:text-foreground',
        disabled && 'opacity-60 cursor-not-allowed'
      )}
    >
      {children}
    </button>
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>Wallet</CardTitle>
        <CardDescription>Openfort embedded or external wallet.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Openfort */}
          <div
            className={cn(
              'rounded-md border p-3 transition-colors',
              isOpenfortActive ? 'border-base-300' : 'border-base-200 opacity-90'
            )}
          >
            <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider">Embedded</p>
            <WalletButton
              isActive={isOpenfortActive}
              disabled={isOpenfortActive || isSwitching}
              onClick={handleSwitchToOpenfort}
            >
              <img src="/openfort-dark.svg" alt="Openfort" className="h-5 w-5 dark:hidden" />
              <img src="/openfort-light.svg" alt="Openfort" className="h-5 w-5 hidden dark:block" />
              <span>Openfort</span>
              {isSwitching && !isOpenfortActive && (
                <span className="ml-auto text-xs text-muted-foreground">Switching…</span>
              )}
            </WalletButton>
          </div>

          {/* External */}
          <div
            className={cn(
              'rounded-md border p-3 transition-colors',
              isExternalActive ? 'border-base-300' : 'border-base-200 opacity-90'
            )}
          >
            <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider">External</p>
            <div className="flex flex-col gap-0.5">
              {externalWallets
                .filter((w) => w.id !== embeddedWalletId)
                .map((w) => {
                  const isActive = wallet.isConnected && wallet.connectorId === w.id
                  const iconUrl = typeof w.icon === 'string' ? w.icon : getConnectorIconUrl(w)
                  return (
                    <WalletButton
                      key={w.id}
                      isActive={!!isActive}
                      disabled={!!isActive}
                      onClick={() => handleConnectExternal(w)}
                    >
                      {iconUrl ? (
                        <img src={iconUrl} alt={w.name} className="h-5 w-5 rounded object-contain" />
                      ) : (
                        <span className="h-5 w-5 rounded bg-base-300 flex items-center justify-center text-[10px] font-medium">
                          {w.name?.[0] ?? '?'}
                        </span>
                      )}
                      <span>{w.name ?? w.id}</span>
                    </WalletButton>
                  )
                })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
