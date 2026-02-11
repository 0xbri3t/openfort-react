import { OpenfortButton, useDisconnect } from '@openfort/react'
import { useQueryClient } from '@tanstack/react-query'
import { Link, useLocation } from '@tanstack/react-router'
import clsx from 'clsx'
import { ChevronDown, SettingsIcon } from 'lucide-react'
import { useCallback, useMemo } from 'react'
import { MODE_ICONS } from '@/assets/chain-icons'
import { ModeToggle } from '@/components/mode-toggle'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Logo } from '@/components/ui/logo'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { clearModeSwitchStorage } from '@/lib/clearModeSwitchStorage'
import { navRoutes } from '@/lib/navRoute'
import type { OpenfortPlaygroundMode } from '@/providers'
import { usePlaygroundMode } from '@/providers'
import type { FileRoutesByTo } from '../routeTree.gen'

const MODE_LABELS: Record<OpenfortPlaygroundMode, string> = {
  'evm-only': 'EVM only',
  'solana-only': 'Solana only',
  'evm-wagmi': 'EVM + Wagmi',
}

export type NavRoute = {
  href?: keyof FileRoutesByTo
  label: string
  exact?: boolean
  children?: NavRoute[]
}

export const Nav = ({ showLogo }: { showLogo?: boolean }) => {
  const location = useLocation()
  const path = location.pathname.includes('showcase') ? '/' : location.pathname
  const { mode, setMode } = usePlaygroundMode()
  const queryClient = useQueryClient()
  const { disconnectAsync } = useDisconnect()

  const handleModeSwitch = useCallback(
    async (next: OpenfortPlaygroundMode) => {
      if (next === mode) return
      try {
        await disconnectAsync()
      } catch {
        /* no-op */
      }
      clearModeSwitchStorage()
      queryClient.clear()
      setMode(next)
    },
    [mode, disconnectAsync, queryClient, setMode]
  )

  const effectiveNavRoutes = useMemo(() => {
    const hasWagmi = mode === 'evm-wagmi'
    return navRoutes.map((route) => {
      if (route.label === 'Utils' && route.children) {
        const children = route.children.filter((child) => {
          if (child.label === 'wagmi') return hasWagmi
          if (child.label === 'EVM adapter (viem)') return !hasWagmi
          return true
        })
        return { ...route, children }
      }
      return route
    })
  }, [mode])

  const isActive = (item: NavRoute) => {
    if (item.exact) {
      return path === item.href
    }
    return (!!item.href && path.includes(item.href)) || item.children?.some((child) => isActive(child))
  }

  return (
    <nav className="h-(--nav-height) pr-4 bg-background-100 border-b w-[100vw] flex fixed z-10">
      <div className="flex items-center w-full gap-4 overflow-x-auto overflow-y-hidden shrink-0 whitespace-nowrap max-w-(--max-screen-width) mx-auto">
        {showLogo && (
          <div className="max-w-xs">
            <Link to="/" className="m-2 p-2 flex items-center">
              <Logo />
            </Link>
          </div>
        )}
        <div className="flex items-center gap-4 ml-auto overflow-x-auto overflow-y-hidden">
          <div className="sm:flex hidden flex gap-4 mr-4 items-center">
            {effectiveNavRoutes.map((route, i) =>
              route.children ? (
                <DropdownMenu key={route.label}>
                  <DropdownMenuTrigger
                    className={clsx(
                      'whitespace-nowrap hover:underline',
                      isActive(route) ? 'text-primary' : 'text-gray-600 dark:text-gray-400'
                    )}
                  >
                    {route.label}
                    <ChevronDown className={clsx('inline-block ml-0.5 transition-transform size-4')} />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    {route.children.map((child) => (
                      <DropdownMenuItem key={child.href} asChild>
                        <Link
                          to={child.href!}
                          className={clsx(
                            'cursor-pointer',
                            isActive(child) ? 'text-primary!' : 'text-gray-600 dark:text-gray-400'
                          )}
                        >
                          {child.label}
                        </Link>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Link
                  key={`${route.href}-${i}`}
                  to={route.href!}
                  className={clsx(
                    'whitespace-nowrap hover:underline',
                    isActive(route) ? 'text-primary' : 'text-gray-600 dark:text-gray-400'
                  )}
                >
                  {route.label}
                </Link>
              )
            )}
          </div>
          <div className="flex gap-4 sm:border-l pl-4 items-center">
            <DropdownMenu>
              <DropdownMenuTrigger className="text-sm text-muted-foreground hover:text-foreground min-w-[7rem] flex items-center justify-center gap-2">
                {MODE_ICONS[mode]}
                {MODE_LABELS[mode]}
                <ChevronDown className="size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {(['evm-only', 'solana-only', 'evm-wagmi'] as const).map((m) => (
                  <DropdownMenuItem
                    key={m}
                    onClick={() => void handleModeSwitch(m)}
                    className="flex items-center gap-2"
                  >
                    {MODE_ICONS[m]}
                    {MODE_LABELS[m]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <ModeToggle className="scale-110" />
            <Tooltip delayDuration={500}>
              <TooltipTrigger asChild>
                <div className="">
                  <OpenfortButton />
                </div>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs" side="bottom">
                <h3 className="text-base mb-1">OpenfortButton</h3>
                This button allows you to connect your wallet and interact with the Openfort SDK.
                <p className="text-xs opacity-70 mt-2">{'<OpenfortButton />'}</p>
              </TooltipContent>
            </Tooltip>
            <Link to={'/provider'} className="btn btn-accent btn-sm btn-circle">
              <SettingsIcon className="size-4.5" />
            </Link>
            <div className="flex items-center sm:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger className="p-2">
                  <div className="flex flex-col gap-1">
                    <div className="w-5 h-0.5 bg-current"></div>
                    <div className="w-5 h-0.5 bg-current"></div>
                    <div className="w-5 h-0.5 bg-current"></div>
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {effectiveNavRoutes.map((route, i) =>
                    route.children ? (
                      route.children.map((child) => (
                        <DropdownMenuItem key={child.href} asChild>
                          <Link
                            to={child.href!}
                            className={clsx(
                              'cursor-pointer',
                              isActive(child) ? 'text-primary!' : 'text-gray-600 dark:text-gray-400'
                            )}
                          >
                            {child.label}
                          </Link>
                        </DropdownMenuItem>
                      ))
                    ) : (
                      <DropdownMenuItem key={`${route.href}-${i}`} asChild>
                        <Link
                          to={route.href!}
                          className={clsx(
                            'cursor-pointer',
                            isActive(route) ? 'text-primary!' : 'text-gray-600 dark:text-gray-400'
                          )}
                        >
                          {route.label}
                        </Link>
                      </DropdownMenuItem>
                    )
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}
