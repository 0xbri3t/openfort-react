# @openfort/wagmi

Wagmi integration for the Openfort React SDK. Use this package when your app uses **wagmi** for EVM (connectors, MetaMask, WalletConnect, ENS, SIWE).

- **@openfort/react** — core SDK (viem + @solana/kit; no wagmi).
- **@openfort/wagmi** — provides `OpenfortWagmiBridge` to connect wagmi to Openfort's core.

## Setup

```tsx
import { WagmiProvider } from 'wagmi'
import { OpenfortProvider } from '@openfort/react'
import { OpenfortWagmiBridge } from '@openfort/wagmi'

<WagmiProvider config={config}>
  <OpenfortWagmiBridge>
    <OpenfortProvider publishableKey="..." walletConfig={...}>
      {children}
    </OpenfortProvider>
  </OpenfortWagmiBridge>
</WagmiProvider>
```

For Solana-only or EVM embedded-only (no external wallets), you do not need this package.
