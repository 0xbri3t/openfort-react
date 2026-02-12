import {
  type EthereumUserWallet,
  embeddedWalletId,
  RecoveryMethod,
  useConnectedWallet,
  useEthereumBridge,
  useWallets,
} from '@openfort/react'
import { Link } from '@tanstack/react-router'
import { AnimatePresence } from 'framer-motion'
import { EyeIcon, EyeOffIcon, FingerprintIcon, KeyIcon, LockIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { MP } from '@/components/motion/motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/cn'

const WalletRecoveryIcon = ({ recovery }: { recovery: RecoveryMethod | undefined }) => {
  switch (recovery) {
    case RecoveryMethod.PASSWORD:
      return <KeyIcon className="h-4 w-4" />
    case RecoveryMethod.PASSKEY:
      return <FingerprintIcon className="h-4 w-4" />
    case RecoveryMethod.AUTOMATIC:
      return <LockIcon className="h-4 w-4" />
    default:
      return null
  }
}

const SimpleWalletButton = ({
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
      isActive ? 'bg-base-300/80 text-foreground' : 'hover:bg-base-300/50 text-muted-foreground hover:text-foreground',
      disabled && 'opacity-60 cursor-not-allowed'
    )}
  >
    {children}
  </button>
)

const CreateWalletButton = () => {
  const wallets = useWallets()
  const isCreating = wallets.isCreating
  const createWallet = wallets.createWallet
  const error = wallets.isError ? wallets.error : null
  const [chooseCreateMethodOpen, setChooseCreateMethodOpen] = useState(false)
  const [creatingMethod, setCreatingMethod] = useState<RecoveryMethod | null>(null)

  useEffect(() => {
    const handleClickOutsideCreateWallet = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.create-wallet-button')) {
        setChooseCreateMethodOpen(false)
      }
    }
    document.addEventListener('click', handleClickOutsideCreateWallet)
    return () => document.removeEventListener('click', handleClickOutsideCreateWallet)
  }, [])

  return (
    <>
      <Tooltip delayDuration={500}>
        <TooltipTrigger asChild>
          <div className="flex w-full gap-2">
            {chooseCreateMethodOpen ? (
              <>
                <button
                  type="button"
                  className="btn btn-accent flex flex-1 create-wallet-button"
                  onClick={() => {
                    createWallet({ recovery: { recoveryMethod: RecoveryMethod.AUTOMATIC } })
                    setCreatingMethod(RecoveryMethod.AUTOMATIC)
                  }}
                  disabled={isCreating}
                >
                  <WalletRecoveryIcon recovery={RecoveryMethod.AUTOMATIC} />
                  Automatic
                </button>
                <button
                  type="button"
                  className="btn btn-accent flex flex-1 create-wallet-button"
                  onClick={() => {
                    createWallet({
                      recovery: {
                        recoveryMethod: RecoveryMethod.PASSWORD,
                        password: 'example-password',
                      },
                    })
                    setCreatingMethod(RecoveryMethod.PASSWORD)
                  }}
                  disabled={isCreating}
                >
                  <WalletRecoveryIcon recovery={RecoveryMethod.PASSWORD} />
                  Password
                </button>
                <button
                  type="button"
                  className="btn btn-accent flex flex-1 create-wallet-button"
                  onClick={() => {
                    createWallet({ recovery: { recoveryMethod: RecoveryMethod.PASSKEY } })
                    setCreatingMethod(RecoveryMethod.PASSKEY)
                  }}
                  disabled={isCreating}
                >
                  <WalletRecoveryIcon recovery={RecoveryMethod.PASSKEY} />
                  Passkey
                </button>
              </>
            ) : (
              <button
                type="button"
                className="btn btn-accent w-full flex create-wallet-button"
                onClick={() => setChooseCreateMethodOpen(true)}
                disabled={isCreating}
              >
                <span className="mr-2">+</span>
                Create new wallet
              </button>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <h3 className="text-base mb-1">useWallets</h3>
          Create a new wallet using
          <Link to="/wallet/useWallets" search={{ focus: 'create' }} className="px-1 group">
            createWallet
          </Link>
          .
        </TooltipContent>
      </Tooltip>
      <AnimatePresence mode="wait">
        {isCreating && (
          <MP
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 0.8, scale: 0.95 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            Creating wallet {creatingMethod && `with ${creatingMethod} recovery`}...
            {creatingMethod === RecoveryMethod.PASSWORD && (
              <span className="text-sm block mt-2 opacity-70">(using password: "example-password")</span>
            )}
          </MP>
        )}
      </AnimatePresence>
      {error && <span className="text-red-500 text-sm mt-2 block">There was an error: {String(error)}</span>}
    </>
  )
}

const EmbeddedWalletButton = ({
  wallet,
  activeWallet,
  connectingAddress,
  setActive,
}: {
  wallet: EthereumUserWallet
  activeWallet: EthereumUserWallet | null
  connectingAddress: string | undefined
  setActive: (opts: {
    walletId: string
    address: `0x${string}`
    recovery?: { recoveryMethod: RecoveryMethod; password?: string }
  }) => Promise<unknown>
}) => {
  const isConnecting = connectingAddress != null && connectingAddress.toLowerCase() === wallet.address.toLowerCase()
  const [password, setPassword] = useState('example-password')
  const [showPasswordInput, setShowPasswordInput] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    const handleClickOutsidePassword = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.password-input')) setShowPasswordInput(false)
    }
    document.addEventListener('click', handleClickOutsidePassword)
    return () => document.removeEventListener('click', handleClickOutsidePassword)
  }, [])

  const isActive = activeWallet != null && activeWallet.address.toLowerCase() === wallet.address.toLowerCase()

  const handleSetActive = () => {
    if (wallet.recoveryMethod === RecoveryMethod.PASSWORD) {
      setActive({
        walletId: embeddedWalletId,
        address: wallet.address,
        recovery: { recoveryMethod: RecoveryMethod.PASSWORD, password },
      })
    } else if (wallet.recoveryMethod === RecoveryMethod.PASSKEY) {
      setActive({
        walletId: embeddedWalletId,
        address: wallet.address,
        recovery: { recoveryMethod: RecoveryMethod.PASSKEY },
      })
    } else {
      setActive({ walletId: embeddedWalletId, address: wallet.address })
    }
  }

  const handleClickWallet = () => {
    if (wallet.recoveryMethod === RecoveryMethod.PASSWORD) {
      setShowPasswordInput(true)
    } else {
      handleSetActive()
    }
  }

  if (showPasswordInput) {
    return (
      <form className={cn('input w-full password-input')}>
        <input
          type={showPassword ? 'text' : 'password'}
          placeholder="Enter password"
          className="grow peer placeholder:text-muted-foreground"
          value={password}
          autoFocus
          onChange={(e) => setPassword(e.target.value)}
        />
        <button
          type="button"
          className="btn btn-ghost btn-sm ml-2 px-2 password-input"
          onClick={() => setShowPassword(!showPassword)}
        >
          {showPassword ? (
            <EyeOffIcon className="h-4 w-4 password-input" />
          ) : (
            <EyeIcon className="h-4 w-4 password-input" />
          )}
        </button>
        <button
          type="submit"
          className="btn btn-accent btn-sm password-input"
          onClick={() => {
            handleSetActive()
            setShowPasswordInput(false)
          }}
        >
          Set Active
        </button>
      </form>
    )
  }

  return (
    <button
      type="button"
      onClick={() => !isActive && handleClickWallet()}
      className={cn('btn btn-accent w-full flex justify-between password-input', {
        'text-primary': isActive,
        'animate-pulse': isConnecting,
      })}
    >
      <div className="flex items-center gap-2">
        <img src="/openfort-dark.svg" alt="Openfort" className="h-5 w-5 dark:hidden" />
        <img src="/openfort-light.svg" alt="Openfort" className="h-5 w-5 hidden dark:block" />
        <span className="text-xs">
          {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
        </span>
      </div>
      <div className="flex items-center gap-2">
        {isConnecting && (
          <MP initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 0.8, scale: 0.95 }}>
            Connecting...
          </MP>
        )}
        <WalletRecoveryIcon recovery={wallet.recoveryMethod} />
      </div>
    </button>
  )
}

/**
 * Unified wallet card: External (left) | Embedded (right).
 * - External: wagmi connectors, click to switch.
 * - Embedded: list of wallets with password/passkey recovery, create button.
 */
export const ConnectExternalWalletCard = () => {
  const wallet = useConnectedWallet()
  const bridge = useEthereumBridge()
  const walletsHook = useWallets()

  const embeddedWallets = walletsHook.wallets.filter((w) => w.id === embeddedWalletId)
  const externalConnectors = bridge?.connectors.filter((c) => c.id !== embeddedWalletId) ?? []

  const isOpenfortActive = wallet.isConnected && wallet.isEmbedded
  const isExternalActive = wallet.isConnected && wallet.isExternal
  const isBusy = wallet.isConnecting || walletsHook.isConnecting || walletsHook.isCreating

  const connectedAddress = wallet.status === 'connected' ? wallet.address : undefined
  const activeWalletFromHook = walletsHook.activeWallet ?? null
  const activeWallet =
    activeWalletFromHook != null
      ? activeWalletFromHook
      : connectedAddress != null
        ? (embeddedWallets.find((w) => w.address.toLowerCase() === connectedAddress.toLowerCase()) ?? null)
        : null
  const connectingAddress = walletsHook.isConnecting
    ? (embeddedWallets.find((w) => w.isConnecting)?.address ?? activeWalletFromHook?.address)
    : undefined

  const setActive = (opts: {
    walletId: string
    address?: `0x${string}`
    recovery?: { recoveryMethod: RecoveryMethod; password?: string }
  }) => walletsHook.setActiveWallet(opts as Parameters<typeof walletsHook.setActiveWallet>[0])

  const handleSelectExternal = (connectorId: string) => {
    if (isBusy) return
    if (walletsHook.isError) walletsHook.reset()
    walletsHook.setActiveWallet({ walletId: connectorId, showUI: true })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Wallets</CardTitle>
        <CardDescription>Switch between external and embedded wallets.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* ── External (left) ── */}
          <div
            className={cn(
              'rounded-md border p-3 transition-colors',
              isExternalActive ? 'border-base-300' : 'border-base-200 opacity-90'
            )}
          >
            <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider">External</p>
            <div className="flex flex-col gap-0.5">
              {externalConnectors.map((c) => {
                const isActive = isExternalActive && wallet.status === 'connected' && wallet.connectorId === c.id
                const icon = 'icon' in c ? c.icon : undefined
                const iconUrl = typeof icon === 'string' ? icon : undefined
                const IconElement = typeof icon === 'object' && icon != null ? icon : null

                return (
                  <SimpleWalletButton
                    key={c.id}
                    isActive={!!isActive}
                    disabled={!!isActive || isBusy}
                    onClick={() => handleSelectExternal(c.id)}
                  >
                    {iconUrl ? (
                      <img src={iconUrl} alt={c.name} className="h-5 w-5 rounded object-contain" />
                    ) : IconElement ? (
                      <span className="h-5 w-5 flex shrink-0 [&>svg]:h-full [&>svg]:w-full [&>svg]:object-contain">
                        {IconElement}
                      </span>
                    ) : (
                      <span className="h-5 w-5 rounded bg-base-300 flex items-center justify-center text-[10px] font-medium">
                        {c.name?.[0] ?? '?'}
                      </span>
                    )}
                    <span>{c.name ?? c.id}</span>
                    {isActive && <span className="ml-auto h-2 w-2 rounded-full bg-green-500" />}
                  </SimpleWalletButton>
                )
              })}
            </div>
          </div>

          {/* ── Embedded (right) ── */}
          <div
            className={cn(
              'rounded-md border p-3 transition-colors',
              isOpenfortActive ? 'border-base-300' : 'border-base-200 opacity-90'
            )}
          >
            <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider">Embedded</p>
            <div className="flex flex-col gap-0.5">
              {walletsHook.isLoadingWallets && (
                <p className="text-xs text-muted-foreground py-2 px-3">Loading wallets...</p>
              )}
              {embeddedWallets.length === 0 && !walletsHook.isLoadingWallets && (
                <p className="text-xs text-muted-foreground py-2 px-3">No embedded wallets yet.</p>
              )}
              {embeddedWallets.map((w) => (
                <Tooltip delayDuration={500} key={w.address}>
                  <TooltipTrigger asChild>
                    <div>
                      <EmbeddedWalletButton
                        wallet={w}
                        activeWallet={activeWallet}
                        connectingAddress={connectingAddress}
                        setActive={setActive}
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="flex flex-col gap-1">
                      <h3 className="text-base mb-1">useWallets</h3>
                      <pre className="flex text-xs flex-col gap-1">
                        {JSON.stringify({ id: w.id, address: w.address, recoveryMethod: w.recoveryMethod }, null, 2)}
                      </pre>
                      {activeWallet?.address.toLowerCase() === w.address.toLowerCase() ? (
                        <p className="text-xs text-green-700">Active wallet</p>
                      ) : (
                        <p className="text-xs opacity-70">
                          Click to set active. (
                          <Link to="/wallet/useWallets" search={{ focus: 'setActive' }}>
                            setActiveWallet
                          </Link>
                          )
                        </p>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              ))}

              <CreateWalletButton />
            </div>
          </div>
        </div>

        {/* Status feedback */}
        {isBusy && <p className="text-xs text-muted-foreground text-center mt-3 animate-pulse">Switching wallet...</p>}
        {walletsHook.isError && <p className="text-xs text-red-500 text-center mt-3">{String(walletsHook.error)}</p>}
      </CardContent>
    </Card>
  )
}
