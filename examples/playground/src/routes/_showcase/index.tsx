import { useOpenfort, useUser } from '@openfort/react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { useEffect } from 'react'
import { App } from '@/components/Showcase/app'
import { usePlaygroundMode } from '@/providers'

export const Route = createFileRoute('/_showcase/')({
  component: RouteComponent,
})

function AuthLoadingScreen() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
      <Loader2 className="size-8 animate-spin text-muted-foreground" />
      <p className="text-sm text-muted-foreground">Restoring session…</p>
    </div>
  )
}

function RouteComponent() {
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
    if (!isLoading && !isAuthenticated) {
      nav({ to: '/showcase/auth', search: true })
    }
  }, [isAuthenticated, isLoading, nav])

  const showRestoringSession = isPostModeSwitch && isLoading
  if (showRestoringSession) {
    return <AuthLoadingScreen />
  }

  if (isAuthenticated) {
    return <App />
  }

  return null
}
