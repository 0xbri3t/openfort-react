import {
  ChainTypeEnum,
  useChain,
  useEthereumEmbeddedWallet,
  useOpenfort,
  useSolanaEmbeddedWallet,
  useUser,
} from '@openfort/react'
import { createFileRoute, Outlet, useNavigate } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { useEffect } from 'react'
import { usePlaygroundMode } from '@/providers'

export const Route = createFileRoute('/_showcase/showcase/auth')({
  component: RouteComponent,
})

function AuthHydratingScreen() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
      <Loader2 className="size-8 animate-spin text-muted-foreground" />
      <p className="text-sm text-muted-foreground">Restoring session…</p>
    </div>
  )
}

function RouteComponent() {
  const { chainType } = useChain()
  const ethereumWallet = useEthereumEmbeddedWallet()
  const solanaWallet = useSolanaEmbeddedWallet()
  const wallet = chainType === ChainTypeEnum.EVM ? ethereumWallet : solanaWallet

  const isConnected = wallet.status === 'connected'
  const { isAuthenticated } = useUser()
  const { isLoading } = useOpenfort()
  const { isPostModeSwitch, clearPostModeSwitch } = usePlaygroundMode()
  const nav = useNavigate()

  useEffect(() => {
    if (!isLoading) {
      clearPostModeSwitch()
    }
  }, [isLoading, clearPostModeSwitch])

  useEffect(() => {
    if (!isLoading && isAuthenticated && isConnected) {
      nav({ to: '/' })
    }
  }, [isConnected, isAuthenticated, isLoading, nav])

  const showRestoringSession = isPostModeSwitch && isLoading
  if (showRestoringSession) {
    return <AuthHydratingScreen />
  }

  return <Outlet />
}

// Fix flashing error: isAuthenticated is false on first render
// function ToFix() {
//   const { isAuthenticated } = useUser()

//   return <>isAuthenticated: {isAuthenticated.toString()}</>
// }
