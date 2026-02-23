import { AccountTypeEnum, type EthereumWalletState, RecoveryMethod, type UserWallet } from '@openfort/react'

type EmbeddedWalletItem = EthereumWalletState['wallets'][number]

import { Link } from '@tanstack/react-router'
import { AnimatePresence } from 'framer-motion'
import {
  ChevronLeftIcon,
  CornerDownRightIcon,
  EyeIcon,
  EyeOffIcon,
  FingerprintIcon,
  KeyIcon,
  LockIcon,
  WalletIcon,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { MP } from '@/components/motion/motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useActiveEthereumEmbeddedWallet } from '@/hooks/useActiveEthereumEmbeddedWallet'
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

const ACCOUNT_TYPE_BADGE: Record<AccountTypeEnum, string> = {
  [AccountTypeEnum.EOA]: 'EOA',
  [AccountTypeEnum.SMART_ACCOUNT]: 'SM',
  [AccountTypeEnum.DELEGATED_ACCOUNT]: 'DE',
}

const AccountTypeBadge = ({ accountType }: { accountType: AccountTypeEnum | undefined }) => {
  if (!accountType) return null
  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        <span className="text-[10px] font-semibold leading-none border rounded px-1 py-0.5 opacity-70">
          {ACCOUNT_TYPE_BADGE[accountType]}
        </span>
      </TooltipTrigger>
      <TooltipContent>{ACCOUNT_TYPE_LABELS[accountType]}</TooltipContent>
    </Tooltip>
  )
}

type CreateStep = 'idle' | 'choose-account-type' | 'choose-recovery-method'

const ACCOUNT_TYPE_LABELS: Record<AccountTypeEnum, string> = {
  [AccountTypeEnum.EOA]: 'EOA',
  [AccountTypeEnum.SMART_ACCOUNT]: 'Smart Account',
  [AccountTypeEnum.DELEGATED_ACCOUNT]: 'Delegated Account',
}

const CreateWalletButton = ({ ethereum }: { ethereum: EthereumWalletState }) => {
  const isCreating = ethereum.status === 'creating'
  const create = ethereum.create
  const error = ethereum.status === 'error' ? ethereum.error : null
  const [selectedAccountType, setSelectedAccountType] = useState<AccountTypeEnum | null>(null)
  const [step, setStep] = useState<CreateStep>('idle')
  const [creatingMethod, setCreatingMethod] = useState<RecoveryMethod | null>(null)

  useEffect(() => {
    const handleClickOutsideCreateWallet = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.create-wallet-button')) {
        setStep('idle')
        setSelectedAccountType(null)
      }
    }

    document.addEventListener('click', handleClickOutsideCreateWallet)

    return () => {
      document.removeEventListener('click', handleClickOutsideCreateWallet)
    }
  }, [])

  const handleSelectAccountType = (accountType: AccountTypeEnum) => {
    setSelectedAccountType(accountType)
    setStep('choose-recovery-method')
  }

  const handleCreateWallet = (recoveryMethod: RecoveryMethod) => {
    if (!selectedAccountType) return
    setCreatingMethod(recoveryMethod)

    const options: Parameters<typeof create>[0] = {
      accountType: selectedAccountType,
    }

    if (recoveryMethod === RecoveryMethod.PASSWORD) {
      options.recovery = { password: 'example-password', recoveryMethod: RecoveryMethod.PASSWORD }
    } else if (recoveryMethod === RecoveryMethod.PASSKEY) {
      options.recovery = { recoveryMethod: RecoveryMethod.PASSKEY }
    }

    create(options)
    setStep('idle')
    setSelectedAccountType(null)
  }

  return (
    <>
      <Tooltip delayDuration={500}>
        <TooltipTrigger asChild>
          <div className="flex w-full flex-col gap-2">
            {step === 'idle' && (
              <button
                type="button"
                className="btn btn-accent w-full flex create-wallet-button"
                onClick={() => setStep('choose-account-type')}
                disabled={isCreating}
              >
                <span className="mr-2">+</span>
                Create new wallet
              </button>
            )}

            {step === 'choose-account-type' && (
              <div className="flex flex-col gap-1 create-wallet-button">
                <span className="text-xs opacity-70 px-1">Account type:</span>
                <div className="flex w-full gap-2">
                  {Object.values(AccountTypeEnum).map((accountType) => (
                    <button
                      key={accountType}
                      type="button"
                      className="btn btn-accent flex flex-1 create-wallet-button"
                      onClick={() => handleSelectAccountType(accountType)}
                      disabled={isCreating}
                    >
                      <WalletIcon className="h-4 w-4" />
                      {ACCOUNT_TYPE_LABELS[accountType]}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 'choose-recovery-method' && (
              <div className="flex flex-col gap-1 create-wallet-button">
                <div className="flex items-center gap-1 px-1">
                  <button
                    type="button"
                    className="create-wallet-button opacity-70 hover:opacity-100"
                    onClick={() => setStep('choose-account-type')}
                  >
                    <ChevronLeftIcon className="h-3 w-3" />
                  </button>
                  <span className="text-xs opacity-70">
                    {selectedAccountType && ACCOUNT_TYPE_LABELS[selectedAccountType]} — Recovery method:
                  </span>
                </div>
                <div className="flex w-full gap-2">
                  <button
                    type="button"
                    className="btn btn-accent flex flex-1 create-wallet-button"
                    onClick={() => handleCreateWallet(RecoveryMethod.AUTOMATIC)}
                    disabled={isCreating}
                  >
                    <WalletRecoveryIcon recovery={RecoveryMethod.AUTOMATIC} />
                    Automatic
                  </button>
                  <button
                    type="button"
                    className="btn btn-accent flex flex-1 create-wallet-button"
                    onClick={() => handleCreateWallet(RecoveryMethod.PASSWORD)}
                    disabled={isCreating}
                  >
                    <WalletRecoveryIcon recovery={RecoveryMethod.PASSWORD} />
                    Password
                  </button>
                  <button
                    type="button"
                    className="btn btn-accent flex flex-1 create-wallet-button"
                    onClick={() => handleCreateWallet(RecoveryMethod.PASSKEY)}
                    disabled={isCreating}
                  >
                    <WalletRecoveryIcon recovery={RecoveryMethod.PASSKEY} />
                    Passkey
                  </button>
                </div>
              </div>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <h3 className="text-base mb-1">useEthereumEmbeddedWallet</h3>
          Create a new wallet using the
          <Link to="/wallet/useEthereumEmbeddedWallet" search={{ focus: 'create' }} className="px-1 group">
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
  nested,
}: {
  wallet: EmbeddedWalletItem
  activeWallet: EmbeddedWalletItem | null
  /** Address of the wallet currently being switched to (only this button shows "Connecting..."). */
  connectingAddress: string | undefined
  setActive: (opts: { address: `0x${string}`; password?: string; recoveryMethod?: RecoveryMethod }) => Promise<void>
  nested?: boolean
}) => {
  const _isConnecting = connectingAddress != null && connectingAddress.toLowerCase() === wallet.address.toLowerCase()
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

  const _isActive = activeWallet != null && activeWallet.address.toLowerCase() === wallet.address.toLowerCase()

  const handleSetActive = () => {
    if (wallet.recoveryMethod === RecoveryMethod.PASSWORD) {
      setActive({ address: wallet.address, recoveryMethod: RecoveryMethod.PASSWORD, password })
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
      <form className={cn('input w-full password-input', nested && 'ml-5')}>
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
    <div className={cn('flex items-center gap-1', nested && 'ml-5')}>
      {nested && <CornerDownRightIcon className="h-3 w-3 shrink-0 opacity-40" />}
      <button
        type="button"
        onClick={() => !wallet.isActive && handleClickWallet()}
        disabled={!wallet.isAvailable}
        className={cn('btn btn-accent w-full flex justify-between password-input', {
          'text-primary': wallet.isActive,
          'animate-pulse': wallet.isConnecting,
        })}
      >
        {wallet.id}
        {wallet.isConnecting && (
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
          <AccountTypeBadge accountType={wallet.accountType} />
          {wallet.address && (
            <span className="text-xs">
              {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
            </span>
          )}
          <WalletRecoveryIcon recovery={wallet.recoveryMethod} />
        </div>
      </button>
    </div>
  )
}

const WalletTooltipItem = ({
  wallet,
  index,
  activeWallet,
  connectingAddress,
  setActive,
  nested,
}: {
  wallet: UserWallet
  index: number
  activeWallet: UserWallet | null
  connectingAddress: string | undefined
  setActive: (opts: { address: `0x${string}`; password?: string; recoveryMethod?: RecoveryMethod }) => Promise<void>
  nested?: boolean
}) => (
  <Tooltip delayDuration={500}>
    <TooltipTrigger asChild>
      <div>
        <WalletButton
          wallet={wallet}
          activeWallet={activeWallet}
          connectingAddress={connectingAddress}
          setActive={setActive}
          nested={nested}
        />
      </div>
    </TooltipTrigger>
    <TooltipContent>
      <div className="flex flex-col gap-1">
        <h3 className="text-base mb-1">useWallets</h3>
        <pre className="flex text-xs flex-col gap-1">
          wallets[{index}] ={' '}
          {JSON.stringify(wallet, (key, value) => (key === 'connector' ? '[Connector object]' : value), 2)}
        </pre>
        {wallet.isActive ? (
          <p className="text-xs text-green-700">Active wallet</p>
        ) : (
          <p className="text-xs opacity-70">
            Click to set this wallet as active. (
            <Link to="/wallet/useWallets" search={{ focus: 'setActiveWallet' }}>
              setActiveWallet
            </Link>
            )
          </p>
        )}
      </div>
    </TooltipContent>
  </Tooltip>
)

export const SetActiveWalletsCardEthereum = () => {
  const { ethereum, activeWallet, connectingAddress } = useActiveEthereumEmbeddedWallet()
  const wallets = ethereum.wallets
  const setActive = ethereum.setActive
  const { topLevel, childrenByOwner } = useMemo(() => {
    const ownerAddresses = new Set(wallets.map((w) => w.address.toLowerCase()))
    const childrenByOwner = new Map<string, UserWallet[]>()
    const topLevel: UserWallet[] = []

    for (const wallet of wallets) {
      const owner = wallet.ownerAddress?.toLowerCase()
      if (owner && ownerAddresses.has(owner) && owner !== wallet.address.toLowerCase()) {
        const existing = childrenByOwner.get(owner) ?? []
        existing.push(wallet)
        childrenByOwner.set(owner, existing)
      } else {
        topLevel.push(wallet)
      }
    }

    return { topLevel, childrenByOwner }
  }, [wallets])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Wallets</CardTitle>
        <CardDescription>Create and switch embedded wallets (useEthereumEmbeddedWallet).</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {topLevel.map((wallet) => {
            const children = childrenByOwner.get(wallet.address.toLowerCase())
            const walletIndex = wallets.indexOf(wallet)
            return (
              <div key={wallet.id} className="space-y-1">
                <WalletTooltipItem
                  wallet={wallet}
                  index={walletIndex}
                  activeWallet={activeWallet}
                  connectingAddress={connectingAddress}
                  setActive={setActive}
                />
                {children?.map((child) => (
                  <WalletTooltipItem
                    key={child.id}
                    wallet={child}
                    index={wallets.indexOf(child)}
                    activeWallet={activeWallet}
                    connectingAddress={connectingAddress}
                    setActive={setActive}
                    nested
                  />
                ))}
              </div>
            )
          })}

          <CreateWalletButton ethereum={ethereum} />
        </div>
      </CardContent>
    </Card>
  )
}
