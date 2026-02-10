import { RecoveryMethod, useEthereumEmbeddedWallet } from '@openfort/react'
import { createFileRoute } from '@tanstack/react-router'
import { onSettledOptions } from '@/components/Variable/commonVariables'
import { HookVariable } from '@/components/Variable/HookVariable'
import { Layout } from '../../../components/Layout'

export const Route = createFileRoute('/_hooks/wallet/useWallets')({
  component: RouteComponent,
})

const defaultOptions = { ...onSettledOptions, chainId: 11155111 }

function RouteComponent() {
  return (
    <Layout>
      <HookVariable
        name="useEthereumEmbeddedWallet"
        hook={useEthereumEmbeddedWallet}
        description="Ethereum embedded wallet hook (viem/openfort-js only, no wagmi). Use for create, setActive, wallets, and activeWallet."
        defaultOptions={defaultOptions}
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
    </Layout>
  )
}
