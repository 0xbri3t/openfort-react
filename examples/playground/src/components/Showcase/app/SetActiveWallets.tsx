import { RecoveryMethod, useConnectedWallet, useEthereumEmbeddedWallet } from '@openfort/react'

/** Inferred from useEthereumEmbeddedWallet().wallets */
type EmbeddedWalletItem = ReturnType<typeof useEthereumEmbeddedWallet>['wallets'][number]

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

const CreateWalletButton = () => {
  const wallet = useConnectedWallet()
  const chainId = wallet.status === 'connected' && wallet.chainId != null ? wallet.chainId : undefined
  const ethereum = useEthereumEmbeddedWallet({ chainId })
  const isCreating = ethereum.status === 'creating'
  const create = ethereum.create
  const error = ethereum.status === 'error' ? ethereum.error : null
  const [chooseCreateMethodOpen, setChooseCreateMethodOpen] = useState(false)
  const [creatingMethod, setCreatingMethod] = useState<RecoveryMethod | null>(null)

  useEffect(() => {
    const handleClickOutsideCreateWallet = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.create-wallet-button')) {
        setChooseCreateMethodOpen(false)
      }
    }

    document.addEventListener('click', handleClickOutsideCreateWallet)

    return () => {
      document.removeEventListener('click', handleClickOutsideCreateWallet)
    }
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
                    create()
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
                    setCreatingMethod(RecoveryMethod.PASSWORD)
                    create({
                      recoveryMethod: RecoveryMethod.PASSWORD,
                      recoveryPassword: 'example-password',
                    })
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
                    setCreatingMethod(RecoveryMethod.PASSKEY)
                    create({
                      recoveryMethod: RecoveryMethod.PASSKEY,
                    })
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
                className="btn btn-accent w-full flex"
                onClick={() => {
                  setChooseCreateMethodOpen(true)
                }}
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
          Create a new wallet using the
          <Link to="/wallet/useWallets" search={{ focus: 'create' }} className="px-1 group">
            create
          </Link>
          function.
        </TooltipContent>
      </Tooltip>
      <AnimatePresence mode="wait">
        {isCreating && (
          <MP
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{
              opacity: 0.8,
              scale: 0.95,
            }}
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

const WalletButton = ({
  wallet,
  activeWallet,
  connectingAddress,
  setActive,
}: {
  wallet: EmbeddedWalletItem
  activeWallet: EmbeddedWalletItem | null
  /** Address of the wallet currently being switched to (only this button shows "Connecting..."). */
  connectingAddress: string | undefined
  setActive: (opts: {
    address: `0x${string}`
    recoveryPassword?: string
    recoveryMethod?: RecoveryMethod
  }) => Promise<void>
}) => {
  const isConnecting = connectingAddress != null && connectingAddress.toLowerCase() === wallet.address.toLowerCase()
  const [password, setPassword] = useState('example-password')
  const [showPasswordInput, setShowPasswordInput] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    const handleClickOutsidePassword = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.password-input')) {
        setShowPasswordInput(false)
      }
    }

    document.addEventListener('click', handleClickOutsidePassword)

    return () => {
      document.removeEventListener('click', handleClickOutsidePassword)
    }
  }, [])

  const isActive = activeWallet != null && activeWallet.address.toLowerCase() === wallet.address.toLowerCase()

  const handleSetActive = () => {
    if (wallet.recoveryMethod === RecoveryMethod.PASSWORD) {
      setActive({ address: wallet.address, recoveryMethod: RecoveryMethod.PASSWORD, recoveryPassword: password })
    } else if (wallet.recoveryMethod === RecoveryMethod.PASSKEY) {
      setActive({ address: wallet.address, recoveryMethod: RecoveryMethod.PASSKEY })
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
      Openfort
      {isConnecting && (
        <MP
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{
            opacity: 0.8,
            scale: 0.95,
          }}
        >
          Connecting...
        </MP>
      )}
      <div className="flex items-center gap-2">
        {wallet.address && (
          <span className="text-xs">
            {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
          </span>
        )}
        <WalletRecoveryIcon recovery={wallet.recoveryMethod} />
      </div>
    </button>
  )
}

export const SetActiveWalletsCard = () => {
  const wallet = useConnectedWallet()
  const chainId = wallet.status === 'connected' && wallet.chainId != null ? wallet.chainId : undefined
  const ethereum = useEthereumEmbeddedWallet({ chainId })
  const wallets = ethereum.wallets
  const connectedAddress = wallet.status === 'connected' ? wallet.address : undefined
  // Prefer ethereum.activeWallet so the list updates immediately when user clicks "Set active".
  // Fall back to connectedAddress (top-right) only when the hook hasn't set an active wallet yet (e.g. initial load).
  const activeWalletFromHook =
    ethereum.status === 'connected' ||
    ethereum.status === 'connecting' ||
    ethereum.status === 'reconnecting' ||
    ethereum.status === 'needs-recovery'
      ? ethereum.activeWallet
      : null
  const activeWallet =
    activeWalletFromHook != null
      ? activeWalletFromHook
      : connectedAddress != null
        ? (wallets.find((w) => w.address.toLowerCase() === connectedAddress.toLowerCase()) ?? null)
        : null
  const connectingAddress =
    ethereum.status === 'connecting' || ethereum.status === 'reconnecting' ? ethereum.activeWallet?.address : undefined

  return (
    <Card>
      <CardHeader>
        <CardTitle>Wallets</CardTitle>
        <CardDescription>Create and switch embedded wallets (useEthereumEmbeddedWallet).</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {ethereum.status === 'fetching-wallets' && (
            <p className="text-sm text-muted-foreground">Loading wallets...</p>
          )}
          {wallets.map((w) => (
            <Tooltip delayDuration={500} key={w.address}>
              <TooltipTrigger asChild>
                <div>
                  <WalletButton
                    wallet={w}
                    activeWallet={activeWallet}
                    connectingAddress={connectingAddress}
                    setActive={ethereum.setActive}
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="flex flex-col gap-1">
                  <h3 className="text-base mb-1">useEthereumEmbeddedWallet</h3>
                  <pre className="flex text-xs flex-col gap-1">
                    wallet ={' '}
                    {JSON.stringify({ id: w.id, address: w.address, recoveryMethod: w.recoveryMethod }, null, 2)}
                  </pre>
                  {activeWallet?.address.toLowerCase() === w.address.toLowerCase() ? (
                    <p className="text-xs text-green-700">Active wallet</p>
                  ) : (
                    <p className="text-xs opacity-70">
                      Click to set this wallet as active. (
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

          <CreateWalletButton />
        </div>
      </CardContent>
    </Card>
  )
}
