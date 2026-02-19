import { AuthProvider, type OpenfortProvider, type OpenfortWalletConfig, RecoveryMethod } from '@openfort/react'
import { baseSepolia, beamTestnet, polygonAmoy } from 'viem/chains'
import { create } from 'zustand'

const defaultWalletConfig: OpenfortWalletConfig = {
  shieldPublishableKey: import.meta.env.VITE_SHIELD_PUBLISHABLE_KEY,
  ethereum: {
    chainId: beamTestnet.id,
    rpcUrls: {
      [polygonAmoy.id]: 'https://rpc-amoy.polygon.technology',
      [beamTestnet.id]: 'https://build.onbeam.com/rpc/testnet',
      [baseSepolia.id]: 'https://sepolia.base.org',
    },
  },
  solana: { cluster: 'devnet' },
  ethereumProviderPolicyId: {
    [polygonAmoy.id]: import.meta.env.VITE_POLYGON_POLICY_ID!,
    [beamTestnet.id]: import.meta.env.VITE_BEAM_POLICY_ID!,
    [baseSepolia.id]: import.meta.env.VITE_BASE_POLICY_ID!,
  },
  createEncryptedSessionEndpoint:
    import.meta.env.VITE_CREATE_ENCRYPTED_SESSION_ENDPOINT ||
    'https://create-next-app.openfort.io/api/protected-create-encryption-session',
  assets: {
    [polygonAmoy.id]: [import.meta.env.VITE_POLYGON_MINT_CONTRACT!],
    [beamTestnet.id]: [import.meta.env.VITE_BEAM_MINT_CONTRACT!],
  },
  requestWalletRecoverOTP: async ({ userId, email, phone }) => {
    await fetch(import.meta.env.VITE_REQUEST_WALLET_RECOVER_OTP_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, email, phone }),
    })
  },
}

const defaultProviderOptions: Parameters<typeof OpenfortProvider>[0] = {
  publishableKey: import.meta.env.VITE_OPENFORT_PUBLISHABLE_KEY,

  uiConfig: {
    theme: 'auto',
    mode: undefined,
    customTheme: undefined,
    authProviders: [
      // AuthProvider.EMAIL_PASSWORD,
      AuthProvider.EMAIL_OTP,
      AuthProvider.PHONE,
      AuthProvider.GUEST,
      AuthProvider.WALLET,
      AuthProvider.GOOGLE,
      AuthProvider.FACEBOOK,
      AuthProvider.TWITTER,
      AuthProvider.DISCORD,
    ],
    phoneConfig: {
      defaultCountry: 'es',
    },
    avoidLayoutShift: undefined,
    bufferPolyfill: undefined,
    customAvatar: undefined,
    disclaimer: undefined,
    walletConnectName: undefined,
    embedGoogleFonts: undefined,
    enforceSupportedChains: undefined,
    hideBalance: undefined,
    hideRecentBadge: undefined,
    hideTooltips: undefined,
    logo: undefined,
    overlayBlur: undefined,
    privacyPolicyUrl: undefined,
    termsOfServiceUrl: undefined,
    reducedMotion: undefined,
    skipEmailVerification: undefined,
    truncateLongENSAddress: undefined,
    walletConnectCTA: undefined,
    authProvidersLength: undefined,

    // linkWalletOnSignUp: LinkWalletOnSignUpOption.OPTIONAL,
    walletRecovery: {
      defaultMethod: RecoveryMethod.AUTOMATIC,
      allowedMethods: [RecoveryMethod.PASSWORD, RecoveryMethod.AUTOMATIC, RecoveryMethod.PASSKEY],
    },
    customPageComponents: undefined,
  },

  walletConfig: defaultWalletConfig,
  onConnect: undefined,
  onDisconnect: undefined,

  overrides: {
    backendUrl: import.meta.env.VITE_API_URL,
    crypto: undefined,
    storage: undefined,
    iframeUrl: import.meta.env.VITE_IFRAME_API_URL,
    shieldUrl: import.meta.env.VITE_SHIELD_URL,
  },
  thirdPartyAuth: undefined,
  debugMode: {
    openfortReactDebugMode: true,
    openfortCoreDebugMode: true,
    shieldDebugMode: true,
    // debugRoutes: true,
  },
}

interface Store {
  providerOptions: Parameters<typeof OpenfortProvider>[0]
  setProviderOptions: (options: Parameters<typeof OpenfortProvider>[0]) => void
}

export const useAppStore = create<Store>((set) => ({
  providerOptions: defaultProviderOptions,
  setProviderOptions: (options) => set({ providerOptions: options }),
}))
