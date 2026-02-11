import { AnimatePresence, motion } from 'framer-motion'
import { useId } from 'react'
import useLocales from '../../../hooks/useLocales'
import { useSolanaContext } from '../../../solana/providers/SolanaContextProvider'
import type { SolanaCluster } from '../../../solana/types'
import styled from '../../../styles/styled'
import { routes } from '../../Openfort/types'
import { useOpenfort } from '../../Openfort/useOpenfort'
import {
  ChainButton,
  ChainButtonBg,
  ChainButtonContainer,
  ChainButtonStatus,
  ChainButtons,
  ChainIcon,
  ChainLogoContainer,
  SwitchNetworksContainer,
} from '../ChainSelectList/styles'

const ClusterButtonBg = styled(ChainButtonBg)<{ $cluster: SolanaCluster }>`
  background: ${(p) =>
    p.$cluster === 'mainnet-beta'
      ? 'linear-gradient(135deg, rgba(153, 69, 255, 0.12) 0%, rgba(20, 241, 149, 0.12) 100%)'
      : p.$cluster === 'devnet'
        ? 'linear-gradient(135deg, rgba(234, 88, 12, 0.12) 0%, rgba(251, 191, 36, 0.12) 100%)'
        : 'linear-gradient(135deg, rgba(71, 85, 105, 0.12) 0%, rgba(148, 163, 184, 0.12) 100%)'};
`

const ClusterIconSvg = ({ cluster }: { cluster: SolanaCluster }) => {
  const id = useId().replace(/:/g, '-')
  return (
    <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle
        cx="12"
        cy="12"
        r="10"
        fill={
          ['mainnet-beta', 'devnet', 'testnet'].includes(cluster)
            ? `url(#solana-cluster-${id}-${cluster})`
            : 'var(--ck-body-color-muted, #6b7280)'
        }
      />
      <defs>
        {cluster === 'mainnet-beta' && (
          <linearGradient
            id={`solana-cluster-${id}-mainnet-beta`}
            x1="2"
            y1="2"
            x2="22"
            y2="22"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#9945FF" />
            <stop offset="1" stopColor="#14F195" />
          </linearGradient>
        )}
        {cluster === 'devnet' && (
          <linearGradient
            id={`solana-cluster-${id}-devnet`}
            x1="2"
            y1="2"
            x2="22"
            y2="22"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#ea580c" />
            <stop offset="1" stopColor="#fbbf24" />
          </linearGradient>
        )}
        {cluster === 'testnet' && (
          <linearGradient
            id={`solana-cluster-${id}-testnet`}
            x1="2"
            y1="2"
            x2="22"
            y2="22"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#475569" />
            <stop offset="1" stopColor="#94a3b8" />
          </linearGradient>
        )}
      </defs>
    </svg>
  )
}

const DEFAULT_OPTIONS: { name: string; cluster: SolanaCluster; rpcUrl?: string }[] = [
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

const ClusterSelectList = ({ onClose }: { onClose?: () => void }) => {
  const { setRoute } = useOpenfort()
  const { cluster, rpcUrl, customClusters, setCluster } = useSolanaContext()

  const options: { name: string; cluster: SolanaCluster; rpcUrl?: string }[] = (
    customClusters && customClusters.length > 0
      ? customClusters.map((c) => ({ name: c.name, cluster: c.cluster, rpcUrl: c.rpcUrl }))
      : DEFAULT_OPTIONS
  ).filter((o) => o.cluster !== 'mainnet-beta')

  const locales = useLocales({})

  const handleSelect = (option: { name: string; cluster: SolanaCluster; rpcUrl?: string }) => {
    if (option.rpcUrl != null) {
      setCluster(option.cluster, option.rpcUrl)
    } else {
      setCluster(option.cluster)
    }
    onClose?.()
    setRoute(routes.SOL_CONNECTED)
  }

  return (
    <SwitchNetworksContainer style={{ marginBottom: -8 }}>
      <ChainButtonContainer>
        <ChainButtons>
          {options.map((option) => {
            const active = isSelected(option, cluster, rpcUrl)
            return (
              <ChainButton
                key={`${option.cluster}-${option.rpcUrl ?? 'default'}`}
                disabled={false}
                onClick={() => handleSelect(option)}
              >
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                    gap: 12,
                    color: active ? 'var(--ck-dropdown-active-color, inherit)' : 'var(--ck-dropdown-color, inherit)',
                  }}
                >
                  <ChainLogoContainer>
                    <ChainIcon>
                      <ClusterIconSvg cluster={option.cluster} />
                    </ChainIcon>
                  </ChainLogoContainer>
                  {option.name}
                </span>
                <ChainButtonStatus>
                  <AnimatePresence initial={false}>
                    {active && (
                      <motion.span
                        key="connectedText"
                        style={{
                          color: 'var(--ck-dropdown-active-color, var(--ck-focus-color))',
                          display: 'block',
                          position: 'relative',
                        }}
                        initial={{ opacity: 0, x: -4 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 4 }}
                        transition={{ ease: [0.76, 0, 0.24, 1], duration: 0.3, delay: 0.2 }}
                      >
                        {locales.connected}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </ChainButtonStatus>
                {active && (
                  <ClusterButtonBg
                    $cluster={option.cluster}
                    layoutId="activeCluster"
                    layout="position"
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                  />
                )}
              </ChainButton>
            )
          })}
        </ChainButtons>
      </ChainButtonContainer>
    </SwitchNetworksContainer>
  )
}

export default ClusterSelectList
