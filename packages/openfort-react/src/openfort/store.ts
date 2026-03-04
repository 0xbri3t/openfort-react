import type { EmbeddedAccount, Openfort, User } from '@openfort/openfort-js'
import { type ChainTypeEnum, EmbeddedState } from '@openfort/openfort-js'
import { createStore, type StoreApi } from 'zustand/vanilla'
import type { WalletFlowStatus } from '../hooks/openfort/walletTypes'
import type { UserAccount } from '../openfortCustomTypes'

export type OpenfortStoreState = {
  user: User | null
  linkedAccounts: UserAccount[]
  embeddedState: EmbeddedState
  embeddedAccounts: EmbeddedAccount[] | undefined
  isLoadingAccounts: boolean
  activeEmbeddedAddress: string | undefined
  walletStatus: WalletFlowStatus
  chainType: ChainTypeEnum
  isLoading: boolean
  needsRecovery: boolean
}

export type OpenfortStoreActions = {
  setUser: (user: User | null) => void
  setLinkedAccounts: (accounts: UserAccount[]) => void
  setEmbeddedState: (state: EmbeddedState) => void
  setEmbeddedAccounts: (accounts: EmbeddedAccount[] | undefined) => void
  setIsLoadingAccounts: (loading: boolean) => void
  setActiveEmbeddedAddress: (address: string | undefined) => void
  setWalletStatus: (status: WalletFlowStatus) => void
  setChainType: (chainType: ChainTypeEnum) => void

  // Injected by CoreOpenfortProvider after mount
  logout: () => Promise<void>
  signUpGuest: () => Promise<void>
  updateUser: (user?: User) => Promise<User | null>
  updateEmbeddedAccounts: (options?: { silent?: boolean }) => Promise<EmbeddedAccount[] | undefined>
  client: Openfort
}

export type OpenfortStore = OpenfortStoreState & OpenfortStoreActions

function computeIsLoading(
  embeddedState: EmbeddedState,
  user: User | null,
  hasBridge: boolean,
  bridgeAddress: string | undefined
): boolean {
  switch (embeddedState) {
    case EmbeddedState.NONE:
    case EmbeddedState.CREATING_ACCOUNT:
      return true
    case EmbeddedState.UNAUTHENTICATED:
      return !!user
    case EmbeddedState.EMBEDDED_SIGNER_NOT_CONFIGURED:
      return !user
    case EmbeddedState.READY:
      if (!user) return true
      if (hasBridge && !bridgeAddress) return true
      return false
    default:
      return true
  }
}

function computeNeedsRecovery(embeddedState: EmbeddedState, embeddedAccounts: EmbeddedAccount[] | undefined): boolean {
  return embeddedState === EmbeddedState.EMBEDDED_SIGNER_NOT_CONFIGURED && (embeddedAccounts?.length ?? 0) > 0
}

const noop = async () => undefined as any

export function createOpenfortStore(
  initialChainType: ChainTypeEnum,
  getBridgeInfo?: () => { hasBridge: boolean; address: string | undefined }
): StoreApi<OpenfortStore> {
  const store = createStore<OpenfortStore>((set) => ({
    user: null,
    linkedAccounts: [],
    embeddedState: EmbeddedState.NONE,
    embeddedAccounts: undefined,
    isLoadingAccounts: false,
    activeEmbeddedAddress: undefined,
    walletStatus: { status: 'idle' },
    chainType: initialChainType,
    isLoading: true,
    needsRecovery: false,

    setUser: (user) => {
      set({ user })
    },
    setLinkedAccounts: (linkedAccounts) => {
      set({ linkedAccounts })
    },
    setEmbeddedState: (embeddedState) => {
      set({ embeddedState })
    },
    setEmbeddedAccounts: (embeddedAccounts) => {
      set({ embeddedAccounts })
    },
    setIsLoadingAccounts: (isLoadingAccounts) => {
      set({ isLoadingAccounts })
    },
    setActiveEmbeddedAddress: (activeEmbeddedAddress) => {
      set({ activeEmbeddedAddress })
    },
    setWalletStatus: (walletStatus) => {
      set({ walletStatus })
    },
    setChainType: (chainType) => {
      set({ chainType })
    },

    // Injected by CoreOpenfortProvider after creation
    logout: noop,
    signUpGuest: noop,
    updateUser: noop,
    updateEmbeddedAccounts: noop,
    client: null as unknown as Openfort,
  }))

  // Recompute derived state when dependencies change
  store.subscribe((state, prev) => {
    const embeddedStateChanged = state.embeddedState !== prev.embeddedState
    const userChanged = state.user !== prev.user
    const embeddedAccountsChanged = state.embeddedAccounts !== prev.embeddedAccounts

    if (embeddedStateChanged || userChanged) {
      const info = getBridgeInfo?.() ?? { hasBridge: false, address: undefined }
      const isLoading = computeIsLoading(state.embeddedState, state.user, info.hasBridge, info.address)
      if (isLoading !== state.isLoading) {
        store.setState({ isLoading })
      }
    }

    if (embeddedStateChanged || embeddedAccountsChanged) {
      const needsRecovery = computeNeedsRecovery(state.embeddedState, state.embeddedAccounts)
      if (needsRecovery !== state.needsRecovery) {
        store.setState({ needsRecovery })
      }
    }
  })

  return store
}
