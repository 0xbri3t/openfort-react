import { useConnectedWallet, useSignOut, useUser } from '@openfort/react'
import { SessionKeysCard } from '@/components/Showcase/app/SessionKeys'
import { SetActiveWalletsCard } from '@/components/Showcase/app/SetActiveWallets'
import { SignaturesCard } from '@/components/Showcase/app/Signatures'
import { SwitchChainCard } from '@/components/Showcase/app/SwitchChain'
import { WriteContractCard } from '@/components/Showcase/app/WriteContract'
import { SampleTooltipLink } from '@/components/Showcase/auth/SampleTooltipLink'
import { Button } from '@/components/Showcase/ui/Button'
import { mode } from '@/providers'

export const App = () => {
  const { user } = useUser()
  const wallet = useConnectedWallet()
  const address = wallet.status === 'connected' ? wallet.address : undefined
  const { signOut } = useSignOut()
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
        {hasWagmi && (
          <>
            <SignaturesCard />
            <WriteContractCard />
            <SwitchChainCard />
            <SessionKeysCard />
          </>
        )}
        <SetActiveWalletsCard />
      </div>
    </div>
  )
}
