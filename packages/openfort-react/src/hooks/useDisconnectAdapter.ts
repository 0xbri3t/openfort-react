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
