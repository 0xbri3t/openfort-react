import { createFileRoute, Link, Outlet, redirect, useLocation } from '@tanstack/react-router'

export const Route = createFileRoute('/_hooks/solana')({
  component: RouteComponent,
  beforeLoad: async ({ location }) => {
    if (location.pathname === '/solana') {
      throw redirect({ to: '/solana/useSolanaAccount' })
    }
  },
})

const nav = [
  { href: '/solana/useSolanaAccount', label: 'useSolanaAccount' },
  { href: '/solana/useSolanaBalance', label: 'useSolanaBalance' },
  { href: '/solana/useDisconnect', label: 'useDisconnect' },
  { href: '/solana/useSwitchCluster', label: 'useSwitchCluster' },
]

function RouteComponent() {
  const { pathname } = useLocation()
  return (
    <div className="flex gap-2 mb-4 w-full justify-between items-start">
      <Outlet />
      <div className="w-full max-w-sm m-4 p-4 border-l ">
        <h1 className="text-2xl mb-2">Solana Hooks</h1>
        <p className="text-muted-foreground mb-1">These are hooks to interact with your Solana wallet.</p>
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
