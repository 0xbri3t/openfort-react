/**
 * Shared disconnect adapter - wraps useSignOut for wallet adapters.
 * Both EVM and Solana disconnect adapters use the same logic.
 */

import type { UseDisconnectLike } from '../wallet-adapters/types'
import { useSignOut } from './openfort/auth/useSignOut'

export function useDisconnectAdapter(): UseDisconnectLike {
  const { signOut } = useSignOut()
  return {
    disconnect: () => {
      signOut()
    },
  }
}
