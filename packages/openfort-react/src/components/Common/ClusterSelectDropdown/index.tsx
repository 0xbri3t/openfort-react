import { AnimatePresence } from 'framer-motion'
import type React from 'react'
import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'

import useMeasure from 'react-use-measure'
import FocusTrap from '../../../hooks/useFocusTrap'
import useLocales from '../../../hooks/useLocales'
import useLockBodyScroll from '../../../hooks/useLockBodyScroll'
import { ResetContainer } from '../../../styles'
import { useThemeContext } from '../../ConnectKitThemeProvider/ConnectKitThemeProvider'
import { useOpenfort } from '../../Openfort/useOpenfort'
import { DropdownContainer, DropdownHeading, DropdownOverlay, DropdownWindow } from '../ChainSelectDropdown/styles'
import ClusterSelectList from '../ClusterSelectList'
import Portal from '../Portal'

const ClusterSelectDropdown: React.FC<{
  children?: React.ReactNode
  open: boolean
  onClose: () => void
  offsetX?: number
  offsetY?: number
}> = ({ children, open, onClose, offsetX = 0, offsetY = 8 }) => {
  const context = useOpenfort()
  const themeContext = useThemeContext()
  const locales = useLocales()

  useLockBodyScroll(open)

  const contentRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const listener = (e: KeyboardEvent) => {
      if (!open) return
      if (e.key === 'Escape') onClose()

      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        if (!contentRef.current) return
        e.preventDefault()

        const focusableEls: NodeListOf<Element> = contentRef.current.querySelectorAll(
          'a[href]:not(:disabled), button:not(:disabled), textarea:not(:disabled), input:not(:disabled), select:not(:disabled)'
        )
        const firstFocusableEl = focusableEls[0] as HTMLElement
        const lastFocusableEl = focusableEls[focusableEls.length - 1] as HTMLElement

        if (e.key === 'ArrowUp') {
          if (document.activeElement === firstFocusableEl) {
            lastFocusableEl?.focus()
          } else {
            let focusItem = document.activeElement?.previousElementSibling as HTMLElement
            if (!focusItem) focusItem = lastFocusableEl
            while (focusItem && (focusItem as HTMLButtonElement).disabled)
              focusItem = focusItem.previousElementSibling as HTMLElement
            focusItem?.focus()
          }
        } else {
          if (document.activeElement === lastFocusableEl) {
            firstFocusableEl?.focus()
          } else {
            let focusItem = document.activeElement?.nextElementSibling as HTMLElement
            if (!focusItem) focusItem = firstFocusableEl
            while (focusItem && (focusItem as HTMLButtonElement).disabled)
              focusItem = focusItem.nextElementSibling as HTMLElement
            focusItem?.focus()
          }
        }
      }
    }
    document.addEventListener('keydown', listener)
    return () => document.removeEventListener('keydown', listener)
  }, [open, onClose])

  const targetRef = useRef<HTMLDivElement | null>(null)
  const innerRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (!node) return
      targetRef.current = node
      refresh()
    },
    [open]
  )
  const [ref, bounds] = useMeasure({
    debounce: 120,
    offsetSize: true,
    scroll: true,
  })

  const refresh = () => {
    if (
      !targetRef.current ||
      bounds.top + bounds.bottom + bounds.left + bounds.right + bounds.height + bounds.width === 0
    ) {
      return
    }
    const x = bounds.left + offsetX
    const y = bounds.top + bounds.height + offsetY
    targetRef.current.style.left = `${x}px`
    targetRef.current.style.top = `${y}px`
  }

  const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect
  useIsomorphicLayoutEffect(refresh, [targetRef.current, bounds, open])
  useEffect(refresh, [open, targetRef.current])

  useEffect(() => {
    refresh()
    window.addEventListener('scroll', onClose)
    window.addEventListener('resize', onClose)
    return () => {
      window.removeEventListener('scroll', onClose)
      window.removeEventListener('resize', onClose)
    }
  }, [onClose])

  return (
    <>
      <div ref={ref}>{children}</div>
      <AnimatePresence>
        {open && (
          <Portal>
            <ResetContainer
              $useTheme={themeContext.theme ?? context.uiConfig.theme}
              $useMode={themeContext.mode ?? context.mode}
              $customTheme={themeContext.customTheme ?? themeContext.customTheme}
            >
              <FocusTrap>
                <DropdownWindow ref={contentRef}>
                  <DropdownOverlay onClick={onClose} />
                  <DropdownContainer
                    ref={innerRef}
                    style={{ left: 0, top: 0 }}
                    initial="collapsed"
                    animate="open"
                    exit="collapsed"
                    variants={{
                      collapsed: {
                        transformOrigin: '0 0',
                        opacity: 0,
                        scale: 0.96,
                        z: 0.01,
                        y: -4,
                        x: 0,
                        transition: { duration: 0.1 },
                      },
                      open: {
                        transformOrigin: '0 0',
                        willChange: 'opacity,transform',
                        opacity: 1,
                        scale: 1,
                        z: 0.01,
                        y: 0,
                        x: 0,
                        transition: { ease: [0.76, 0, 0.24, 1], duration: 0.15 },
                      },
                    }}
                  >
                    <DropdownHeading>{locales.switchNetworks}</DropdownHeading>
                    <ClusterSelectList onClose={onClose} />
                  </DropdownContainer>
                </DropdownWindow>
              </FocusTrap>
            </ResetContainer>
          </Portal>
        )}
      </AnimatePresence>
    </>
  )
}

export default ClusterSelectDropdown
