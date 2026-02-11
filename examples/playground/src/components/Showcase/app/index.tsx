import { useConnectedWallet, useSignOut, useUser } from '@openfort/react'
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
import { usePlaygroundMode } from '@/providers'

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
            <SignaturesCardSolana />
            <MintTokensCard />
            <SwitchClusterCardSolana />
            <CreateSessionKeyCardSolana />
            <SetActiveWalletsCardSolana />
          </>
        ) : hasWagmi ? (
          <>
            <SignaturesCard />
            <WriteContractCard />
            <SwitchChainCard />
            <SessionKeysCard />
          </>
        ) : (
          <>
            <SignaturesCardEVM />
            <WriteContractCardEVM />
            <SwitchChainCardEVM />
            <SessionKeysCardEVM />
          </>
        )}
        {!isSolana && (hasWagmi ? <SetActiveWalletsCardWagmi /> : <SetActiveWalletsCard />)}
      </div>
    </div>
  )
}
