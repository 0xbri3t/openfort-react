import {
  type ConnectedEmbeddedEthereumWallet,
  type EmbeddedEthereumWalletState,
  RecoveryMethod,
  useEthereumBridge,
} from '@openfort/react'
import { useWalletAuth } from '@openfort/wagmi'
import { Link } from '@tanstack/react-router'
import { AnimatePresence } from 'framer-motion'
import { EyeIcon, EyeOffIcon, FingerprintIcon, KeyIcon, LockIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { MP } from '@/components/motion/motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useActiveEmbeddedWallet } from '@/hooks/useActiveEmbeddedWallet'
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

const CreateWalletButton = ({ ethereum }: { ethereum: EmbeddedEthereumWalletState }) => {
  const { create, status } = ethereum
  const [error, setError] = useState<string | null>(null)
  const isCreating = status === 'creating'
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
                  onClick={async () => {
                    try {
                      setCreatingMethod(RecoveryMethod.AUTOMATIC)
                      await create({ recoveryMethod: RecoveryMethod.AUTOMATIC })
                    } catch (err) {
                      setError(err instanceof Error ? err.message : 'Failed to create wallet')
                      setCreatingMethod(null)
                    }
                  }}
                  disabled={isCreating}
                >
                  <WalletRecoveryIcon recovery={RecoveryMethod.AUTOMATIC} />
                  Automatic
                </button>
                <button
                  type="button"
                  className="btn btn-accent flex flex-1 create-wallet-button"
                  onClick={async () => {
                    try {
                      setCreatingMethod(RecoveryMethod.PASSWORD)
                      await create({
                        recoveryMethod: RecoveryMethod.PASSWORD,
                        recoveryPassword: 'example-password',
                      })
                    } catch (err) {
                      setError(err instanceof Error ? err.message : 'Failed to create wallet')
                      setCreatingMethod(null)
                    }
                  }}
                  disabled={isCreating}
                >
                  <WalletRecoveryIcon recovery={RecoveryMethod.PASSWORD} />
                  Password
                </button>
                <button
                  type="button"
                  className="btn btn-accent flex flex-1 create-wallet-button"
                  onClick={async () => {
                    try {
                      setCreatingMethod(RecoveryMethod.PASSKEY)
                      await create({ recoveryMethod: RecoveryMethod.PASSKEY })
                    } catch (err) {
                      setError(err instanceof Error ? err.message : 'Failed to create wallet')
                      setCreatingMethod(null)
                    }
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
          <h3 className="text-base mb-1">useEthereumEmbeddedWallet</h3>
          Create a new wallet using
          <Link to="/wallet/useWallets" search={{ focus: 'create' }} className="px-1 group">
            create
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
      {error && <span className="text-red-500 text-sm mt-2 block">There was an error: {error}</span>}
    </>
  )
}

const EmbeddedWalletButton = ({
  wallet,
  activeWallet,
  connectingAddress,
  setActive,
}: {
  wallet: ConnectedEmbeddedEthereumWallet
  activeWallet: ConnectedEmbeddedEthereumWallet | null
  connectingAddress: string | undefined
  setActive: (opts: {
    address: `0x${string}`
    recoveryMethod?: RecoveryMethod
    recoveryPassword?: string
  }) => Promise<void>
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
        address: wallet.address,
        recoveryMethod: RecoveryMethod.PASSWORD,
        recoveryPassword: password,
      })
    } else if (wallet.recoveryMethod === RecoveryMethod.PASSKEY) {
      setActive({
        address: wallet.address,
        recoveryMethod: RecoveryMethod.PASSKEY,
      })
    } else {
      setActive({ address: wallet.address })
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
  const bridge = useEthereumBridge()
  const { ethereum, activeWallet, connectingAddress } = useActiveEmbeddedWallet()
  const { availableWallets: externalConnectors } = useWalletAuth()

  const embeddedWallets = ethereum.wallets
  const isOpenfortActive = ethereum.status === 'connected'
  const isExternalActive = ethereum.isExternal
  const isBusy = ethereum.isLoading

  const setActive = async (opts: {
    address: `0x${string}`
    recoveryMethod?: RecoveryMethod
    recoveryPassword?: string
  }) => {
    await ethereum.setActive(opts)
  }

  const handleSelectExternal = (connectorId: string) => {
    if (isBusy || !bridge) return
    const wallet = externalConnectors.find((c) => c.id === connectorId)
    if (wallet) bridge.connect({ connector: wallet.connector })
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
                const isActive = isExternalActive && ethereum.status === 'connected' && ethereum.connectorId === c.id
                const iconSrc = typeof c.icon === 'string' ? c.icon : undefined
                const iconNode = typeof c.icon !== 'string' && c.icon != null ? c.icon : null

                return (
                  <SimpleWalletButton
                    key={c.id}
                    isActive={!!isActive}
                    disabled={!!isActive || isBusy}
                    onClick={() => handleSelectExternal(c.id)}
                  >
                    {iconSrc ? (
                      <span className="h-5 w-5 flex shrink-0">
                        <img src={iconSrc} alt="" className="h-full w-full object-contain" />
                      </span>
                    ) : iconNode ? (
                      <span className="h-5 w-5 flex shrink-0 [&>svg]:h-full [&>svg]:w-full [&>img]:h-full [&>img]:w-full [&>img]:object-contain">
                        {iconNode}
                      </span>
                    ) : (
                      <span className="h-5 w-5 rounded bg-base-300 flex items-center justify-center text-[10px] font-medium">
                        {c.name?.[0] ?? c.id?.[0] ?? '?'}
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
              {ethereum.status === 'fetching-wallets' && (
                <p className="text-xs text-muted-foreground py-2 px-3">Loading wallets...</p>
              )}
              {embeddedWallets.length === 0 && ethereum.status !== 'fetching-wallets' && (
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
                      <h3 className="text-base mb-1">useEthereumEmbeddedWallet</h3>
                      <pre className="flex text-xs flex-col gap-1">
                        {JSON.stringify({ id: w.id, address: w.address, recoveryMethod: w.recoveryMethod }, null, 2)}
                      </pre>
                      {activeWallet?.address.toLowerCase() === w.address.toLowerCase() ? (
                        <p className="text-xs text-green-700">Active wallet</p>
                      ) : (
                        <p className="text-xs opacity-70">
                          Click to set active. (
                          <Link to="/wallet/useWallets" search={{ focus: 'setActive' }}>
                            setActive
                          </Link>
                          )
                        </p>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              ))}

              <CreateWalletButton ethereum={ethereum} />
            </div>
          </div>
        </div>

        {/* Status feedback */}
        {isBusy && <p className="text-xs text-muted-foreground text-center mt-3 animate-pulse">Switching wallet...</p>}
        {ethereum.status === 'error' && ethereum.error && (
          <p className="text-xs text-red-500 text-center mt-3">{ethereum.error}</p>
        )}
      </CardContent>
    </Card>
  )
}
