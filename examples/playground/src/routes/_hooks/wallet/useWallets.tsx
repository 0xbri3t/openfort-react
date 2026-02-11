import { RecoveryMethod, useEthereumEmbeddedWallet } from '@openfort/react'
import { useSolanaEmbeddedWallet } from '@openfort/react/solana'
import { createFileRoute } from '@tanstack/react-router'
import { polygonAmoy } from 'viem/chains'
import { Layout } from '@/components/Layout'
import { onSettledOptions } from '@/components/Variable/commonVariables'
import { HookVariable } from '@/components/Variable/HookVariable'
import { usePlaygroundMode } from '@/providers'

export const Route = createFileRoute('/_hooks/wallet/useWallets')({
  component: RouteComponent,
})

const evmDefaultOptions = { ...onSettledOptions, chainId: polygonAmoy.id }

function EvmContent() {
  return (
    <HookVariable
      name="useEthereumEmbeddedWallet"
      hook={useEthereumEmbeddedWallet}
      description="Ethereum embedded wallet hook (viem/openfort-js only, no wagmi). Use for create, setActive, wallets, and activeWallet."
      defaultOptions={evmDefaultOptions}
      variables={{
        setActive: {
          description: 'Set the active embedded wallet by address.',
          inputs: {
            address: {
              type: 'text',
              placeholder: '0x...',
              required: true,
            },
            recoveryMethod: {
              type: 'select',
              options: ['undefined', RecoveryMethod.PASSWORD, RecoveryMethod.PASSKEY, RecoveryMethod.AUTOMATIC],
            },
            recoveryPassword: {
              type: 'password',
            },
          },
        },
        exportPrivateKey: {
          description: 'Export the private key of the active wallet.',
        },
        create: {
          description: 'Create a new embedded wallet.',
          inputs: {
            recoveryMethod: {
              type: 'select',
              options: ['undefined', RecoveryMethod.PASSWORD, RecoveryMethod.PASSKEY, RecoveryMethod.AUTOMATIC],
            },
            recoveryPassword: {
              type: 'password',
            },
          },
        },
        setRecovery: {
          description: 'Update recovery method for the wallet.',
        },
        activeWallet: {
          description: 'The currently active embedded wallet (when status is connected).',
          typescriptType: 'ConnectedEmbeddedEthereumWallet | null',
        },
        wallets: {
          description: 'List of embedded Ethereum wallets.',
          typescriptType: 'ConnectedEmbeddedEthereumWallet[]',
        },
        status: {
          description:
            'Current wallet state: disconnected | fetching-wallets | connecting | creating | connected | needs-recovery | error.',
        },
      }}
    />
  )
}

function SolanaContent() {
  return (
    <HookVariable
      name="useSolanaEmbeddedWallet"
      hook={useSolanaEmbeddedWallet}
      description="Solana embedded wallet hook. Use for create, setActive, wallets, and activeWallet (Base58 addresses)."
      variables={{
        setActive: {
          description: 'Set the active embedded wallet by address.',
        },
        create: {
          description: 'Create a new Solana embedded wallet.',
        },
        activeWallet: {
          description: 'The currently active embedded wallet (when status is connected).',
        },
        wallets: {
          description: 'List of embedded Solana wallets.',
        },
        status: {
          description:
            'Current wallet state: disconnected | fetching-wallets | connecting | creating | connected | needs-recovery | error.',
        },
      }}
    />
  )
}

function RouteComponent() {
  const { mode } = usePlaygroundMode()
  const isSolana = mode === 'solana-only'

  return (
    <Layout>
      <p className="text-sm text-muted-foreground">
        For app code that works with either chain, use <code>useEmbeddedWallet()</code> from{' '}
        <code>@openfort/react</code>; this page shows the underlying chain-specific hooks for inspection.
      </p>
      {isSolana ? <SolanaContent /> : <EvmContent />}
    </Layout>
  )
}
