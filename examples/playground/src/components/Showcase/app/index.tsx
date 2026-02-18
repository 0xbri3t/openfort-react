import {
  ChainTypeEnum,
  useChain,
  useEthereumEmbeddedWallet,
  useSignOut,
  useSolanaEmbeddedWallet,
  useUser,
} from '@openfort/react'
import { Link } from '@tanstack/react-router'
import { ConnectExternalWalletCard } from '@/components/Showcase/app/ConnectExternalWalletCard'
import { CreateSessionKeyCardSolana } from '@/components/Showcase/app/CreateSessionKeyCardSolana'
import { MintTokensCard } from '@/components/Showcase/app/MintTokensCard'
import { SessionKeysCard } from '@/components/Showcase/app/SessionKeys'
import { SessionKeysCardEVM } from '@/components/Showcase/app/SessionKeysCardEVM'
import { SetActiveWalletsCard } from '@/components/Showcase/app/SetActiveWallets'
import { SetActiveWalletsCardSolana } from '@/components/Showcase/app/SetActiveWalletsCardSolana'
import { SignaturesCard } from '@/components/Showcase/app/Signatures'
import { SignaturesCardEVM } from '@/components/Showcase/app/SignaturesCardEVM'
import { SignaturesCardSolana } from '@/components/Showcase/app/SignaturesCardSolana'
import { SwitchChainCard } from '@/components/Showcase/app/SwitchChain'
import { SwitchChainCardEVM } from '@/components/Showcase/app/SwitchChainCardEVM'
import { WriteContractCard } from '@/components/Showcase/app/WriteContract'
import { WriteContractCardEVM } from '@/components/Showcase/app/WriteContractCardEVM'
import { SampleTooltipLink } from '@/components/Showcase/auth/SampleTooltipLink'
import { Button } from '@/components/Showcase/ui/Button'
import { TruncatedText } from '@/components/TruncatedText'
import { usePlaygroundMode } from '@/providers'

export const App = () => {
  const { user } = useUser()
  const { chainType } = useChain()
  const ethereumWallet = useEthereumEmbeddedWallet()
  const solanaWallet = useSolanaEmbeddedWallet()
  const wallet = chainType === ChainTypeEnum.EVM ? ethereumWallet : solanaWallet

  const address = wallet.status === 'connected' && 'address' in wallet ? wallet.address : undefined
  const { signOut } = useSignOut()
  const { mode } = usePlaygroundMode()
  const isSolana = mode === 'solana-only'
  const hasWagmi = mode === 'evm-wagmi'

  return (
    <div className="h-full w-full p-4 ">
      <div className="flex justify-between items-start mb-6">
        <div className="space-y-1">
          <h1 className="text-xl">Welcome, {user?.id}</h1>
          <p className="text-muted-foreground">Connected with {address ? <TruncatedText text={address} /> : '...'}</p>
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
                hook: 'useSolanaMessageSigner',
                body: <>Signs messages using @solana/kit MessagePartialSigner from @openfort/react/solana.</>,
              }}
            />
            <MintTokensCard
              tooltip={{
                hook: 'useSolanaSendTransaction',
                body: <>Sends SOL using useSolanaSendTransaction from @openfort/react/solana.</>,
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
            <div className="lg:col-span-2 xl:col-span-3 flex flex-col lg:flex-row gap-4">
              <SessionKeysCard
                tooltip={{
                  hook: 'useGrantPermissions',
                  body: <>Uses useGrantPermissions to create session keys.</>,
                }}
              />
              <div className="min-w-[60%] flex-1">
                <ConnectExternalWalletCard />
              </div>
            </div>
          </>
        ) : (
          <>
            <SignaturesCardEVM
              tooltip={{
                hook: 'viem signMessage',
                body: <>Signs messages using viem WalletClient with the embedded provider.</>,
              }}
            />
            <WriteContractCardEVM
              tooltip={{
                hook: 'viem readContract / writeContract',
                body: <>Reads and writes contracts using viem with the embedded provider.</>,
              }}
            />
            <SwitchChainCardEVM
              tooltip={{
                hook: 'wallet_switchEthereumChain',
                body: <>Switches EVM chain using the embedded wallet provider RPC call.</>,
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
        {!isSolana && !hasWagmi && <SetActiveWalletsCard />}
      </div>
    </div>
  )
}
