import { embeddedWalletId, useConnectedWallet, useSignOut, useUser } from '@openfort/react'
import { Link } from '@tanstack/react-router'
import { useAccount } from 'wagmi'
import { ConnectExternalWalletCard } from '@/components/Showcase/app/ConnectExternalWalletCard'
import { CreateSessionKeyCardSolana } from '@/components/Showcase/app/CreateSessionKeyCardSolana'
import { MintTokensCard } from '@/components/Showcase/app/MintTokensCard'
import { SessionKeysCard } from '@/components/Showcase/app/SessionKeys'
import { SessionKeysCardEVM } from '@/components/Showcase/app/SessionKeysCardEVM'
import { SetActiveWalletsCard } from '@/components/Showcase/app/SetActiveWallets'
import { SetActiveWalletsCardSolana } from '@/components/Showcase/app/SetActiveWalletsCardSolana'
import { SetActiveWalletsCardWagmi } from '@/components/Showcase/app/SetActiveWalletsCardWagmi'
import { SignaturesCard } from '@/components/Showcase/app/Signatures'
import { SignaturesCardEVM } from '@/components/Showcase/app/SignaturesCardEVM'
import { SignaturesCardSolana } from '@/components/Showcase/app/SignaturesCardSolana'
import { SwitchChainCard } from '@/components/Showcase/app/SwitchChain'
import { SwitchChainCardEVM } from '@/components/Showcase/app/SwitchChainCardEVM'
import { SwitchClusterCardSolana } from '@/components/Showcase/app/SwitchClusterCardSolana'
import { WriteContractCard } from '@/components/Showcase/app/WriteContract'
import { WriteContractCardEVM } from '@/components/Showcase/app/WriteContractCardEVM'
import { SampleTooltipLink } from '@/components/Showcase/auth/SampleTooltipLink'
import { Button } from '@/components/Showcase/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { usePlaygroundMode } from '@/providers'

function SetActiveWalletsCardWagmiWhenOpenfort() {
  const { connector, isConnected } = useAccount()
  const isOpenfortActive = isConnected && connector?.id === embeddedWalletId
  if (!isOpenfortActive) {
    return (
      <Card className="opacity-75 pointer-events-none">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>Wallets</CardTitle>
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
              Switch to Openfort
            </span>
          </div>
          <CardDescription>
            Create and switch embedded wallets. Connect Openfort from the Wallet card to use this.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Connect to Openfort embedded wallet above to create and manage your wallets.
          </p>
        </CardContent>
      </Card>
    )
  }
  return <SetActiveWalletsCardWagmi />
}

export const App = () => {
  const { user } = useUser()
  const wallet = useConnectedWallet()
  const address = wallet.status === 'connected' ? wallet.address : undefined
  const { signOut } = useSignOut()
  const { mode } = usePlaygroundMode()
  const isSolana = mode === 'solana-only'
  const hasWagmi = mode === 'evm-wagmi'

  return (
    <div className="h-full w-full p-4 ">
      <div className="flex justify-between items-start mb-6">
        <div className="space-y-1">
          <h1 className="text-xl">Welcome, {user?.id}</h1>
          <p className="text-muted-foreground">Connected with {address}</p>
        </div>

        <SampleTooltipLink href="/auth/useSignOut" hook="useSignOut" fn="signOut">
          <Button
            className="btn btn-accent btn-sm"
            onClick={() => {
              signOut()
            }}
          >
            Sign out
          </Button>
        </SampleTooltipLink>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {isSolana ? (
          <>
            <SignaturesCardSolana
              tooltip={{
                hook: 'useSVMSignMessage',
                body: <>Uses useSVMSignMessage for signing messages.</>,
              }}
            />
            <MintTokensCard
              tooltip={{
                hook: 'useSVMWriteContract',
                body: <>Uses useSVMWriteContract for minting devnet SOL.</>,
              }}
            />
            <SwitchClusterCardSolana
              tooltip={{
                hook: 'useSVMSwitchCluster',
                body: (
                  <>
                    Uses{' '}
                    <Link to="/solana/useSwitchCluster" className="px-1 group">
                      useSVMSwitchCluster
                    </Link>{' '}
                    to switch clusters.
                  </>
                ),
              }}
            />
            <CreateSessionKeyCardSolana />
            <SetActiveWalletsCardSolana />
          </>
        ) : hasWagmi ? (
          <>
            <SignaturesCard
              tooltip={{
                hook: 'useSignMessage',
                body: <>Uses useSignMessage (wagmi) for signing messages.</>,
              }}
            />
            <WriteContractCard
              tooltip={{
                hook: 'useWriteContract',
                body: <>Uses useWriteContract (wagmi) for minting tokens.</>,
              }}
            />
            <SwitchChainCard
              tooltip={{
                hook: 'useSwitchChain',
                body: (
                  <>
                    Uses{' '}
                    <Link to="/wagmi/useSwitchChain" className="px-1 group">
                      useChainId
                    </Link>
                    , useSwitchChain (wagmi).
                  </>
                ),
              }}
            />
            <SessionKeysCard
              tooltip={{
                hook: 'useGrantPermissions',
                body: <>Uses useGrantPermissions to create session keys.</>,
              }}
            />
            <ConnectExternalWalletCard />
          </>
        ) : (
          <>
            <SignaturesCardEVM
              tooltip={{
                hook: 'useEVMSignMessage',
                body: <>Uses useEVMSignMessage (EVM adapter) for signing messages.</>,
              }}
            />
            <WriteContractCardEVM
              tooltip={{
                hook: 'useEVMWriteContract',
                body: <>Uses useEVMWriteContract for minting tokens.</>,
              }}
            />
            <SwitchChainCardEVM
              tooltip={{
                hook: 'useEVMSwitchChain',
                body: (
                  <>
                    Uses{' '}
                    <Link to="/adapter/useSwitchChain" className="px-1 group">
                      useEVMSwitchChain
                    </Link>
                    .
                  </>
                ),
              }}
            />
            <SessionKeysCardEVM
              tooltip={{
                hook: 'useGrantPermissions',
                body: <>Uses useGrantPermissions to create session keys.</>,
              }}
            />
          </>
        )}
        {!isSolana && (hasWagmi ? <SetActiveWalletsCardWagmiWhenOpenfort /> : <SetActiveWalletsCard />)}
      </div>
    </div>
  )
}
