import { useState } from 'react'
import { useSolanaContext } from '../../../solana/providers/SolanaContextProvider'
import type { SolanaCluster } from '../../../solana/types'
import Button from '../../Common/Button'
import { ModalHeading } from '../../Common/Modal/styles'
import { routes } from '../../Openfort/types'
import { useOpenfort } from '../../Openfort/useOpenfort'
import { PageContent } from '../../PageContent'
import {
  ClusterList,
  ClusterOption,
  ClusterOptionCheck,
  ClusterOptionName,
  MainnetConfirm,
  MainnetConfirmActions,
} from './styles'

const DEFAULT_OPTIONS: { name: string; cluster: SolanaCluster; rpcUrl?: string }[] = [
  { name: 'Mainnet', cluster: 'mainnet-beta' },
  { name: 'Devnet', cluster: 'devnet' },
  { name: 'Testnet', cluster: 'testnet' },
]

function isSelected(
  option: { cluster: SolanaCluster; rpcUrl?: string },
  currentCluster: SolanaCluster,
  currentRpcUrl: string
): boolean {
  if (option.cluster !== currentCluster) return false
  if (option.rpcUrl == null) return true
  return option.rpcUrl === currentRpcUrl
}

export default function SwitchCluster() {
  const { setRoute } = useOpenfort()
  const { cluster, rpcUrl, customClusters, setCluster } = useSolanaContext()
  const [pendingMainnet, setPendingMainnet] = useState<{
    cluster: 'mainnet-beta'
    rpcUrl?: string
  } | null>(null)

  const options: { name: string; cluster: SolanaCluster; rpcUrl?: string }[] =
    customClusters && customClusters.length > 0
      ? customClusters.map((c) => ({ name: c.name, cluster: c.cluster, rpcUrl: c.rpcUrl }))
      : DEFAULT_OPTIONS

  const handleSelect = (option: { name: string; cluster: SolanaCluster; rpcUrl?: string }) => {
    if (option.cluster === 'mainnet-beta') {
      setPendingMainnet({ cluster: 'mainnet-beta', rpcUrl: option.rpcUrl })
      return
    }
    if (option.rpcUrl != null) {
      setCluster(option.cluster, option.rpcUrl)
    } else {
      setCluster(option.cluster)
    }
    setRoute(routes.SOL_CONNECTED)
  }

  const handleConfirmMainnet = () => {
    if (!pendingMainnet) return
    if (pendingMainnet.rpcUrl != null) {
      setCluster('mainnet-beta', pendingMainnet.rpcUrl)
    } else {
      setCluster('mainnet-beta')
    }
    setPendingMainnet(null)
    setRoute(routes.SOL_CONNECTED)
  }

  const handleCancelMainnet = () => {
    setPendingMainnet(null)
  }

  return (
    <PageContent onBack={routes.SOL_CONNECTED}>
      <ModalHeading>Switch cluster</ModalHeading>
      <ClusterList>
        {options.map((option) => {
          const active = isSelected(option, cluster, rpcUrl)
          return (
            <ClusterOption
              key={`${option.cluster}-${option.rpcUrl ?? 'default'}`}
              type="button"
              $active={active}
              onClick={() => handleSelect(option)}
            >
              <ClusterOptionName>{option.name}</ClusterOptionName>
              {active && <ClusterOptionCheck>✓</ClusterOptionCheck>}
            </ClusterOption>
          )
        })}
      </ClusterList>

      {pendingMainnet !== null && (
        <MainnetConfirm>
          You are switching to mainnet. Transactions will use real funds.
          <MainnetConfirmActions>
            <Button variant="secondary" onClick={handleCancelMainnet}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleConfirmMainnet}>
              Switch to mainnet
            </Button>
          </MainnetConfirmActions>
        </MainnetConfirm>
      )}
    </PageContent>
  )
}
