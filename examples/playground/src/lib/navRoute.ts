import type { NavRoute } from '@/components/Nav'

export const navRoutes: NavRoute[] = [
  {
    label: 'Auth hooks',
    children: [
      {
        href: '/auth/useGuestAuth',
        label: 'useGuestAuth',
      },
      {
        href: '/auth/useEmailAuth',
        label: 'useEmailAuth',
      },
      {
        href: '/auth/useOauth',
        label: 'useOauth',
      },
      {
        href: '/auth/useAuthCallback',
        label: 'useAuthCallback',
      },
      {
        href: '/auth/useConnectWithSiwe',
        label: 'useConnectWithSiwe',
        evmOnly: true,
      },
      {
        href: '/auth/useWalletAuth',
        label: 'useWalletAuth',
        evmOnly: true,
      },
      {
        href: '/auth/useSignOut',
        label: 'useSignOut',
      },
      {
        href: '/auth/useUser',
        label: 'useUser',
      },
    ],
  },
  {
    label: 'Wallet hooks',
    children: [
      {
        href: '/wallet/useSolanaEmbeddedWallet',
        label: 'useSolanaEmbeddedWallet',
      },
      {
        href: '/wallet/useEthereumEmbeddedWallet',
        label: 'useEthereumEmbeddedWallet',
      },
      {
        href: '/wallet/useEthereumWalletAssets',
        label: 'useEthereumWalletAssets',
      },
    ],
  },
  {
    label: 'Utils',
    children: [
      {
        href: '/utils/useUI',
        label: 'useUI',
      },
      {
        href: '/wagmi',
        label: 'wagmi',
      },
    ],
  },
]
