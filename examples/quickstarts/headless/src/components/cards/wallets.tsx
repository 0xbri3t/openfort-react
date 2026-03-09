import {
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ClipboardDocumentIcon,
  FingerPrintIcon,
  KeyIcon,
  LockClosedIcon,
} from '@heroicons/react/24/outline'
import {
  RecoveryMethod,
  type ConnectedEmbeddedEthereumWallet,
  useEthereumEmbeddedWallet,
  useSignOut,
  useUser,
} from '@openfort/react'
import { useState } from 'react'
import { useAccount } from 'wagmi'
import { CreateWallet, CreateWalletSheet } from '../createWallet'
import { WalletRecoverPasswordSheet } from '../passwordRecovery'

const VISIBLE_WALLET_COUNT = 4

export const Wallets = () => {
  const {
    wallets,
    status,
    activeWallet,
    setActive,
    exportPrivateKey,
  } = useEthereumEmbeddedWallet()
  const isLoadingWallets = status === 'fetching-wallets'
  const isConnecting = status === 'connecting'
  const { user, isAuthenticated } = useUser()
  const { isConnected } = useAccount()
  const [createWalletSheetOpen, setCreateWalletSheetOpen] = useState(false)
  const [walletToRecover, setWalletToRecover] =
    useState<ConnectedEmbeddedEthereumWallet | null>(null)
  const [showAllWallets, setShowAllWallets] = useState(false)
  const [exportedKey, setExportedKey] = useState<string | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const { signOut } = useSignOut()

  const handleExportKey = async () => {
    setIsExporting(true)
    setExportError(null)
    setExportedKey(null)
    try {
      const key = await exportPrivateKey()
      setExportedKey(key)
    } catch {
      setExportError('Cannot export private key for this wallet.')
    } finally {
      setIsExporting(false)
    }
  }

  if (!activeWallet && isConnecting) return <div>recovering ...</div>
  if (isLoadingWallets || (!user && isAuthenticated)) {
    return <div>Loading wallets...</div>
  }
  if (wallets.length === 0) {
    return (
      <div className="flex gap-2 flex-col w-full">
        <h1>Create a wallet</h1>
        <p>You do not have any wallet yet.</p>
        <CreateWallet />
      </div>
    )
  }

  const renderWalletRecovery = (wallet: ConnectedEmbeddedEthereumWallet) => {
    let Icon = LockClosedIcon
    let text = 'Unknown'
    const method = wallet.recoveryMethod

    switch (method) {
      case RecoveryMethod.PASSWORD:
        Icon = KeyIcon
        text = 'Password'
        break
      case RecoveryMethod.AUTOMATIC:
        Icon = LockClosedIcon
        text = 'Automatic'
        break
      case RecoveryMethod.PASSKEY:
        Icon = FingerPrintIcon
        text = 'Passkey'
        break
    }

    return (
      <div className="flex items-center text-xs">
        <span>{text}</span>
        <Icon className="h-5 w-5 ml-2" />
      </div>
    )
  }

  const handleWalletClick = (wallet: ConnectedEmbeddedEthereumWallet) => {
    const isActive = activeWallet?.address.toLowerCase() === wallet.address.toLowerCase()
    if (isActive || isConnecting) return
    const method = wallet.recoveryMethod
    if (method === RecoveryMethod.PASSWORD) {
      setWalletToRecover(wallet)
    } else {
      setActive({ address: wallet.address })
    }
  }

  return (
    <div className="flex flex-col w-full">
      <h1>Wallets</h1>
      <p className="mb-4 text-sm text-zinc-400">
        Select a wallet to connect to your account.
      </p>
      <div className="space-y-4 pb-4">
        <h2>Your Wallets</h2>
        <div className="flex flex-col space-y-2">
          {(showAllWallets
            ? wallets
            : wallets.slice(0, VISIBLE_WALLET_COUNT)
          ).map((wallet: ConnectedEmbeddedEthereumWallet) => {
            const isActive =
              activeWallet?.address.toLowerCase() === wallet.address.toLowerCase()
            return (
              <button
                key={wallet.id + wallet.address}
                className="px-4 py-3 border data-[active=true]:border-zinc-300 border-zinc-700 rounded data-[active=false]:cursor-pointer data-[active=false]:hover:bg-zinc-700/20 hover:border-zinc-300 transition-colors flex-1 text-sm"
                onClick={() => handleWalletClick(wallet)}
                data-active={isActive}
                disabled={isActive || isConnecting}
                type="button"
              >
                {isConnecting && isActive ? (
                  <p>Connecting...</p>
                ) : (
                  <div className="flex justify-between items-center">
                    <p className="font-medium mr-2">
                      {`${wallet.address.substring(0, 6)}...${wallet.address.substring(wallet.address.length - 4)}`}
                    </p>
                    {renderWalletRecovery(wallet)}
                  </div>
                )}
              </button>
            )
          })}

          {wallets.length > VISIBLE_WALLET_COUNT && (
            <button
              type="button"
              className="flex items-center justify-center gap-1 text-xs text-zinc-400 hover:text-zinc-200 cursor-pointer transition-colors py-1"
              onClick={() => setShowAllWallets((prev) => !prev)}
            >
              {showAllWallets ? (
                <>
                  Show less <ChevronUpIcon className="h-4 w-4" />
                </>
              ) : (
                <>
                  Show {wallets.length - VISIBLE_WALLET_COUNT} more{' '}
                  <ChevronDownIcon className="h-4 w-4" />
                </>
              )}
            </button>
          )}

          <button
            className="p-3 border border-zinc-700 rounded cursor-pointer hover:bg-zinc-700/20 hover:border-zinc-300 transition-colors flex-1"
            onClick={() => setCreateWalletSheetOpen(true)}
            type="button"
          >
            + Create Wallet
          </button>
        </div>

        {activeWallet && (
          <div className="mt-4 space-y-2">
            <button
              type="button"
              className="w-full p-3 border border-zinc-700 rounded cursor-pointer hover:bg-zinc-700/20 hover:border-zinc-300 transition-colors text-sm flex items-center justify-center gap-2"
              onClick={handleExportKey}
              disabled={isExporting}
            >
              <KeyIcon className="h-4 w-4" />
              {isExporting ? 'Exporting...' : 'Export Private Key'}
            </button>
            {exportError && (
              <p className="text-red-400 text-xs">{exportError}</p>
            )}
            {exportedKey && (
              <div className="flex items-center gap-2 p-3 border border-zinc-700 rounded bg-zinc-800 text-xs break-all font-mono">
                <span className="flex-1">{exportedKey}</span>
                <button
                  type="button"
                  className="shrink-0 p-1 rounded hover:bg-zinc-700 transition-colors cursor-pointer"
                  onClick={() => {
                    navigator.clipboard.writeText(exportedKey)
                    setCopied(true)
                    setTimeout(() => setCopied(false), 2000)
                  }}
                >
                  {copied ? (
                    <CheckIcon className="h-4 w-4 text-green-400" />
                  ) : (
                    <ClipboardDocumentIcon className="h-4 w-4 text-zinc-400" />
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      <WalletRecoverPasswordSheet
        wallet={walletToRecover}
        open={!!walletToRecover}
        onClose={() => setWalletToRecover(null)}
      />
      <CreateWalletSheet
        open={createWalletSheetOpen}
        onClose={() => setCreateWalletSheetOpen(false)}
      />

      {!isConnected && (
        <button
          onClick={() => {
            signOut()
          }}
          className="mt-auto btn"
        >
          Sign Out
        </button>
      )}
    </div>
  )
}
