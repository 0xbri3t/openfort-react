import { ChainTypeEnum } from '@openfort/openfort-js'
import { useCallback, useState } from 'react'
import { useSignOut } from '../hooks/openfort/auth/useSignOut'
import { useConnectedWallet } from '../hooks/useConnectedWallet'
import { useOpenfortCore } from '../openfort/useOpenfort'
import { useChain } from '../shared/hooks/useChain'
import { useSolanaBalance } from '../solana/hooks/useSolanaBalance'
import { useSolanaEmbeddedWallet } from '../solana/hooks/useSolanaEmbeddedWallet'
import { useSolanaSendTransaction } from '../solana/hooks/useSolanaSendTransaction'
import { lamportsToSol } from '../solana/hooks/utils'
import { signMessage as signMessageOp } from '../solana/operations'
import { useSolanaContext } from '../solana/providers/SolanaContextProvider'
import type {
  SolanaCluster,
  UseBalanceLike,
  UseDisconnectLike,
  UseSolanaAccountLike,
  UseSolanaSendSOLLike,
  UseSolanaSignMessageLike,
  UseSolanaSwitchClusterLike,
} from './types'

const DEFAULT_CLUSTERS: SolanaCluster[] = ['devnet', 'testnet']

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

export function useSolanaBalanceAdapter(): UseBalanceLike {
  const { address, isConnected } = useSolanaAccount()
  const { data, refetch, isLoading, error } = useSolanaBalance(address, { enabled: isConnected && !!address })
  const refetchCb = useCallback(() => {
    refetch()
  }, [refetch])
  return {
    data: data
      ? {
          value: data.lamports,
          formatted: lamportsToSol(data.lamports).toFixed(9),
          symbol: 'SOL',
          decimals: 9,
        }
      : undefined,
    refetch: refetchCb,
    isLoading,
    error: error ?? null,
  }
}

export function useSolanaDisconnect(): UseDisconnectLike {
  const { signOut } = useSignOut()
  return {
    disconnect: () => {
      signOut()
    },
  }
}

export function useSolanaSwitchCluster(): UseSolanaSwitchClusterLike {
  const { cluster, setCluster } = useSolanaContext()
  return {
    clusters: DEFAULT_CLUSTERS,
    currentCluster: cluster,
    switchCluster: (c: SolanaCluster) => setCluster(c),
    isPending: false,
    error: null,
  }
}

export function useSolanaSignMessageAdapter(): UseSolanaSignMessageLike {
  const core = useOpenfortCore()
  const wallet = useSolanaEmbeddedWallet()
  const [data, setData] = useState<string | undefined>(undefined)
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const signMessage = useCallback(
    async (params: { message: string }) => {
      if (!core?.client || wallet.status !== 'connected') {
        setError(new Error('Wallet not connected'))
        return
      }
      setError(null)
      setIsPending(true)
      try {
        const signature = await signMessageOp({
          message: params.message,
          client: core.client,
        })
        setData(signature)
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)))
      } finally {
        setIsPending(false)
      }
    },
    [core?.client, wallet.status]
  )

  return { data, signMessage, isPending, error }
}

export function useSolanaSendSOL(): UseSolanaSendSOLLike {
  const { sendTransaction, status, error, reset } = useSolanaSendTransaction()
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
    error: error ?? null,
    reset: resetWithClear,
  }
}
