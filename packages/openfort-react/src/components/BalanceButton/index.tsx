import { AnimatePresence, motion } from 'framer-motion'
import type React from 'react'
import { useEffect, useState } from 'react'
import { keyframes } from 'styled-components'

import { chainConfigs } from '../../constants/chainConfigs'
import { useBalance } from '../../hooks/useBalance'
import { useChainIsSupported } from '../../hooks/useChainIsSupported'
import { useConnectedWallet } from '../../hooks/useConnectedWallet'
import useIsMounted from '../../hooks/useIsMounted'
import styled from '../../styles/styled'
import type { All } from '../../types'
import { nFormatter } from '../../utils'
import Chain from '../Common/Chain'
import ThemedButton from '../Common/ThemedButton'

const Container = styled(motion.div)`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
`
const PlaceholderKeyframes = keyframes`
  0%,100%{ opacity: 0.1; transform: scale(0.75); }
  50%{ opacity: 0.75; transform: scale(1.2) }
`
const PulseContainer = styled.div`
  pointer-events: none;
  user-select: none;
  padding: 0 5px;
  span {
    display: inline-block;
    vertical-align: middle;
    margin: 0 2px;
    width: 3px;
    height: 3px;
    border-radius: 4px;
    background: currentColor;
    animation: ${PlaceholderKeyframes} 1000ms ease infinite both;
  }
`

type BalanceProps = {
  hideIcon?: boolean
  hideSymbol?: boolean
}

export const Balance: React.FC<BalanceProps> = ({ hideIcon, hideSymbol }) => {
  const isMounted = useIsMounted()
  const [isInitial, setIsInitial] = useState(true)

  // Use new abstraction hooks (no wagmi)
  const wallet = useConnectedWallet()
  const isConnected = wallet.status === 'connected'
  const address = isConnected ? wallet.address : undefined
  const chainId = isConnected ? wallet.chainId : undefined
  const chainType = isConnected ? wallet.chainType : 'ethereum'

  const isChainSupported = useChainIsSupported(chainId)

  // Use new useBalance hook (always call, use enabled option - React rules compliant)
  const balance = useBalance({
    address: address ?? '',
    chainType,
    chainId: chainId ?? 1,
    enabled: isConnected && !!address,
    refetchInterval: 30_000, // Replaces blockNumber-based invalidation
  })

  const currentChain = chainConfigs.find((c) => c.id === chainId)
  const balanceFormatted = balance.status === 'success' ? balance.formatted : undefined
  const balanceSymbol = balance.status === 'success' ? balance.symbol : undefined

  const state = `${
    !isMounted || balanceFormatted === undefined ? `balance-loading` : `balance-${currentChain?.id}-${balanceFormatted}`
  }`

  useEffect(() => {
    setIsInitial(false)
  }, [])

  return (
    <div style={{ position: 'relative' }}>
      <AnimatePresence initial={false}>
        <motion.div
          key={state}
          initial={
            balanceFormatted !== undefined && isInitial
              ? {
                  opacity: 1,
                }
              : { opacity: 0, position: 'absolute', top: 0, left: 0, bottom: 0 }
          }
          animate={{ opacity: 1, position: 'relative' }}
          exit={{
            opacity: 0,
            position: 'absolute',
            top: 0,
            left: 0,
            bottom: 0,
          }}
          transition={{
            duration: 0.4,
            ease: [0.25, 1, 0.5, 1],
            delay: 0.4,
          }}
        >
          {!isConnected || !isMounted || balanceFormatted === undefined ? (
            <Container>
              {!hideIcon && <Chain id={chainId} />}
              <span style={{ minWidth: 32 }}>
                <PulseContainer>
                  <span style={{ animationDelay: '0ms' }} />
                  <span style={{ animationDelay: '50ms' }} />
                  <span style={{ animationDelay: '100ms' }} />
                </PulseContainer>
              </span>
            </Container>
          ) : !isChainSupported ? (
            <Container>
              {!hideIcon && <Chain id={chainId} />}
              <span style={{ minWidth: 32 }}>???</span>
            </Container>
          ) : (
            <Container>
              {!hideIcon && <Chain id={chainId} />}
              <span style={{ minWidth: 32 }}>{nFormatter(Number(balanceFormatted))}</span>
              {!hideSymbol && balanceSymbol && ` ${balanceSymbol}`}
            </Container>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

const _BalanceButton: React.FC<All & BalanceProps> = ({ theme, mode, customTheme, hideIcon, hideSymbol }) => {
  return (
    <ThemedButton duration={0.4} variant={'secondary'} theme={theme} mode={mode} customTheme={customTheme}>
      <Balance hideIcon={hideIcon} hideSymbol={hideSymbol} />
    </ThemedButton>
  )
}
