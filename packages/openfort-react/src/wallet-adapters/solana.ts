import { ChainTypeEnum } from '@openfort/openfort-js'
import { useCallback, useEffect, useRef, useState } from 'react'
import { routes } from '../components/Openfort/types'
import { useOpenfort } from '../components/Openfort/useOpenfort'
import { OpenfortError, OpenfortErrorCode } from '../core/errors'
import { useConnectedWallet } from '../hooks/useConnectedWallet'
import { useDisconnectAdapter } from '../hooks/useDisconnectAdapter'
import { useOpenfortCore } from '../openfort/useOpenfort'
import { useChain } from '../shared/hooks/useChain'
import { useSolanaEmbeddedWallet } from '../solana/hooks/useSolanaEmbeddedWallet'
import { useSolanaSendTransaction } from '../solana/hooks/useSolanaSendTransaction'
import { signMessage as signMessageOp } from '../solana/operations'
import { logger } from '../utils/logger'
import type { UseDisconnectLike, UseSolanaAccountLike, UseSolanaSendSOLLike, UseSolanaSignMessageLike } from './types'

/**
 * Returns the connected Solana account.
 *
 * @returns address, cluster, and isConnected
 *
 * @example
 * ```tsx
 * const { address, cluster } = useSolanaAccount()
 * ```
 */
export function useSolanaAccount(): UseSolanaAccountLike {
  const wallet = useConnectedWallet()
  const { chainType } = useChain()
  const isConnected = wallet.status === 'connected' && chainType === ChainTypeEnum.SVM && !!wallet.address
  return {
    address: isConnected ? wallet.address : undefined,
    cluster: isConnected && wallet.cluster ? wallet.cluster : undefined,
    isConnected,
  }
}

/**
 * Disconnects the Solana wallet and logs out. Full logout (auth + wallet).
 *
 * @returns disconnect, disconnectAsync, isPending, error, reset
 */
export function useSolanaDisconnect(): UseDisconnectLike {
  return useDisconnectAdapter()
}

/**
 * Signs a message with the connected Solana wallet.
 *
 * @returns signMessage(params), data, isPending, error
 *
 * @example
 * ```tsx
 * const { signMessage } = useSolanaSignMessage()
 * const sig = await signMessage({ message: 'Hello' })
 * ```
 */
export function useSolanaSignMessage(): UseSolanaSignMessageLike {
  const core = useOpenfortCore()
  const { open, setOpen, setRoute } = useOpenfort()
  const wallet = useSolanaEmbeddedWallet()
  const [data, setData] = useState<string | undefined>(undefined)
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const pendingSignRef = useRef<{ message: string } | null>(null)
  const prevOpenRef = useRef(open)

  useEffect(() => {
    const wasOpen = prevOpenRef.current
    prevOpenRef.current = open
    if (wasOpen && !open && pendingSignRef.current && wallet.status === 'connected' && core?.client) {
      const params = pendingSignRef.current
      pendingSignRef.current = null
      setError(null)
      setIsPending(true)
      signMessageOp({ message: params.message, client: core.client })
        .then((sig) => {
          setData(sig)
        })
        .catch((err) => {
          setError(err instanceof OpenfortError ? err : OpenfortError.from(err, OpenfortErrorCode.SIGNING_FAILED))
        })
        .finally(() => {
          setIsPending(false)
        })
    }
  }, [open, wallet.status, core?.client])

  const signMessage = useCallback(
    async (params: { message: string }) => {
      logger.log('[Solana signMessage] called', {
        hasClient: !!core?.client,
        walletStatus: wallet.status,
        activeAddress: wallet.status === 'connected' ? wallet.activeWallet?.address : undefined,
        walletsCount: wallet.wallets?.length ?? 0,
        messageLength: params.message?.length,
      })
      if (!core?.client) {
        logger.log('[Solana signMessage] abort: no client')
        setError(new Error('Wallet not connected'))
        return
      }
      if (wallet.status !== 'connected') {
        const list = wallet.wallets ?? []
        if (list.length > 0) {
          logger.log('[Solana signMessage] opening modal to recover wallet', { walletsCount: list.length })
          pendingSignRef.current = { message: params.message }
          setOpen(true)
          if (list.length > 1) {
            setRoute(routes.SELECT_WALLET_TO_RECOVER)
          } else {
            const w = list[0]
            setRoute({
              route: routes.SOL_RECOVER_WALLET,
              wallet: {
                id: w.id,
                address: w.address,
                chainType: ChainTypeEnum.SVM,
                isAvailable: true,
                accounts: [{ id: w.id }],
                recoveryMethod: w.recoveryMethod,
              },
            })
          }
          setError(new Error('Recover your wallet in the modal — sign will complete automatically after recovery'))
          return
        }
        logger.log('[Solana signMessage] abort: wallet not ready', { walletStatus: wallet.status })
        setError(new Error('Wallet not connected'))
        return
      }
      setError(null)
      setIsPending(true)
      try {
        logger.log('[Solana signMessage] signing...', { messageLength: params.message?.length })
        const signature = await signMessageOp({
          message: params.message,
          client: core.client,
        })
        logger.log('[Solana signMessage] success', {
          signatureLength: signature?.length,
          signaturePreview: signature ? `${signature.slice(0, 12)}...${signature.slice(-8)}` : undefined,
        })
        setData(signature)
      } catch (err) {
        const errorObj = err instanceof OpenfortError ? err : OpenfortError.from(err, OpenfortErrorCode.SIGNING_FAILED)
        logger.log('[Solana signMessage] error', { message: errorObj.message, cause: err })
        setError(errorObj)
      } finally {
        setIsPending(false)
      }
    },
    [core?.client, wallet.status, wallet.wallets?.length, setOpen, setRoute]
  )

  return {
    data,
    signMessage,
    isPending,
    isLoading: isPending,
    isError: error != null,
    isSuccess: !isPending && data != null,
    error,
  }
}

/**
 * Sends SOL to an address. Use when not using wagmi.
 *
 * @returns sendSOL({ to, lamports }), data, isPending, error, reset
 *
 * @example
 * ```tsx
 * const { sendSOL } = useSolanaWriteContract()
 * await sendSOL({ to: address, lamports: BigInt(1e9) })
 * ```
 */
export function useSolanaWriteContract(): UseSolanaSendSOLLike {
  const { sendTransaction, status, isLoading, isError, isSuccess, error, reset } = useSolanaSendTransaction()
  const [data, setData] = useState<string | undefined>(undefined)

  const sendSOL = useCallback(
    async (params: { to: string; lamports: bigint }) => {
      const sig = await sendTransaction({
        to: params.to,
        amount: params.lamports,
      })
      if (sig) setData(sig)
    },
    [sendTransaction]
  )

  const resetWithClear = useCallback(() => {
    reset()
    setData(undefined)
  }, [reset])

  return {
    sendSOL,
    data,
    isPending: status === 'signing' || status === 'sending',
    isLoading,
    isError,
    isSuccess,
    error: error ?? null,
    reset: resetWithClear,
  }
}
