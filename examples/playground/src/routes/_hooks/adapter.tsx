import { createFileRoute, Link, Outlet, redirect, useLocation } from '@tanstack/react-router'

export const Route = createFileRoute('/_hooks/adapter')({
  component: RouteComponent,
  beforeLoad: async ({ location }) => {
    if (location.pathname === '/adapter') {
      throw redirect({ to: '/adapter/useAccount' })
    }
  },
})

const nav = [
  { href: '/adapter/useAccount', label: 'useEthereumAccount' },
  { href: '/adapter/useBalance', label: 'useEthereumBalance' },
  { href: '/adapter/useDisconnect', label: 'useEthereumDisconnect' },
  { href: '/adapter/useSwitchChain', label: 'useEthereumSwitchChain' },
]

function RouteComponent() {
  const { pathname } = useLocation()
  return (
    <div className="flex gap-2 mb-4 w-full justify-between items-start">
      <Outlet />
      <div className="w-full max-w-sm m-4 p-4 border-l ">
        <h1 className="text-2xl mb-2">EVM adapter (viem)</h1>
        <p className="text-muted-foreground mb-1">
          Viem-based hooks when not using Wagmi. Same API shape as wagmi for account, balance, disconnect, switch chain.
        </p>
        <div className="flex flex-col gap-1 p-4">
          {nav.map((item) => (
            <Link
              to={item.href}
              key={item.href}
              className={`block mb-1 ${pathname === item.href ? 'text-primary' : 'opacity-70 hover:opacity-100 transition-opacity text-muted-foreground'}`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
