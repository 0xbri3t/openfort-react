import { motion } from 'framer-motion'
import type React from 'react'
import { useEffect, useId, useState } from 'react'
import defaultTheme from '../../../constants/defaultTheme'
import useLocales from '../../../hooks/useLocales'
import styled from '../../../styles/styled'
import { flattenChildren, isMobile } from '../../../utils'
import { routes } from '../../Openfort/types'
import { useOpenfort } from '../../Openfort/useOpenfort'
import ClusterSelectDropdown from '../ClusterSelectDropdown'

const Container = styled(motion.div)``

const SwitchClusterButton = styled(motion.button)`
  --color: var(
    --ck-dropdown-button-color,
    var(--ck-button-primary-color, var(--ck-body-color))
  );
  --background: var(
    --ck-dropdown-button-background,
    var(--ck-secondary-button-background, var(--ck-body-background-secondary))
  );
  --box-shadow: var(
    --ck-dropdown-button-box-shadow,
    var(
      --ck-secondary-button-box-shadow,
      var(--ck-button-primary-box-shadow),
      none
    )
  );

  --hover-color: var(--ck-dropdown-button-hover-color, var(--color));
  --hover-background: var(
    --ck-dropdown-button-hover-background,
    var(--background)
  );
  --hover-box-shadow: var(
    --ck-dropdown-button-hover-box-shadow,
    var(--box-shadow)
  );

  --active-color: var(--ck-dropdown-button-active-color, var(--hover-color));
  --active-background: var(
    --ck-dropdown-button-active-background,
    var(--hover-background)
  );
  --active-box-shadow: var(
    --ck-dropdown-button-active-box-shadow,
    var(--hover-box-shadow)
  );

  appearance: none;
  user-select: none;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-radius: 15px;
  width: 52px;
  height: 30px;
  padding: 2px 6px 2px 3px;
  font-size: 16px;
  line-height: 19px;
  font-weight: 500;
  text-decoration: none;
  white-space: nowrap;
  transform: translateZ(0px);
  border: none;
  cursor: pointer;

  transition: 100ms ease;
  transition-property: transform, background-color, box-shadow, color;

  color: var(--color);
  background: var(--background);
  box-shadow: var(--box-shadow);

  svg {
    position: relative;
    display: block;
  }

  @media only screen and (min-width: ${defaultTheme.mobileWidth + 1}px) {
    &:hover,
    &:focus-visible {
      color: var(--hover-color);
      background: var(--hover-background);
      box-shadow: var(--hover-box-shadow);
    }
    &:active {
      color: var(--active-color);
      background: var(--active-background);
      box-shadow: var(--active-box-shadow);
    }
  }
`

const ClusterIconSvg = ({ cluster }: { cluster: string }) => {
  const id = useId().replace(/:/g, '-')
  return (
    <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle
        cx="12"
        cy="12"
        r="10"
        fill={
          ['mainnet-beta', 'devnet', 'testnet'].includes(cluster)
            ? `url(#cluster-trigger-${id}-${cluster})`
            : 'var(--ck-body-color-muted, #6b7280)'
        }
      />
      <defs>
        {cluster === 'mainnet-beta' && (
          <linearGradient
            id={`cluster-trigger-${id}-mainnet-beta`}
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
            id={`cluster-trigger-${id}-devnet`}
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
            id={`cluster-trigger-${id}-testnet`}
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

const ChevronDown = ({ ...props }) => (
  <svg
    aria-hidden="true"
    width="11"
    height="6"
    viewBox="0 0 11 6"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path d="M1.5 1L5.5 5L9.5 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const ClusterSelector: React.FC<{ cluster: string; clusterDisplay: string }> = ({ cluster }) => {
  const context = useOpenfort()
  const [isOpen, setIsOpen] = useState(false)

  const mobile = isMobile() || (typeof window !== 'undefined' && window.innerWidth < defaultTheme.mobileWidth)

  useEffect(() => {
    if (!context.open) setIsOpen(false)
  }, [context.open])

  const locales = useLocales()

  return (
    <Container>
      <ClusterSelectDropdown offsetX={-12} open={!mobile && isOpen} onClose={() => setIsOpen(false)}>
        <SwitchClusterButton
          aria-label={flattenChildren(locales.switchNetworks).toString()}
          onClick={() => {
            if (mobile) {
              context.setRoute(routes.SOL_SWITCH_CLUSTER)
            } else {
              setIsOpen(!isOpen)
            }
          }}
        >
          <ClusterIconSvg cluster={cluster} />
          <ChevronDown style={{ top: 1, left: -3 }} />
        </SwitchClusterButton>
      </ClusterSelectDropdown>
    </Container>
  )
}

export default ClusterSelector
