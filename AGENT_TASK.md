# Agent Task: Clean @openfort/react Exports — Minimal Changes

## Context

`@openfort/react` v0.2.7 is the last published version (on npm & GitHub main).
It has **56 established exports** that external developers may depend on.
The local branch adds **97 new exports** (Solana, adapters, strategies, new error system) that have **never shipped**.

**Goal:** Clean up the 97 new exports before shipping. Don't break the 56 established ones.
**Principle:** Minimal diff. Only touch `index.ts` exports and what's strictly needed to support the changes. Don't refactor hook internals, rename files, or restructure directories.

## Codebase

- Entry: `packages/openfort-react/src/index.ts`
- Lint: `pnpm check` (biome + eslint)
- Test: `pnpm test`
- Playground: `pnpm --filter playground dev`

---

## Phase 1: Remove Internal Leaks from New Exports

These were added locally but are implementation details. Remove from `index.ts` only. Do NOT delete source files.

```
# Core internals — devs use OpenfortProvider, not these
CoreProvider, CoreProviderProps, useCoreContext, useHasCoreProvider
ConnectionStrategyProvider, useConnectionStrategy
createEthereumBridgeStrategy, createEthereumEmbeddedStrategy
ConnectionStrategy, ConnectionStrategyState, ConnectRoute
DEFAULT_DEV_CHAIN_ID
queryKeys
CoreContextValue, WalletReadiness

# Internal hooks
useConnectLifecycle
useConnectRoutes

# Raw context (keep the hook useEthereumBridge, remove the Context object)
OpenfortEthereumBridgeContext

# Adapter interface types (too granular — internal)
UseAccountLike, UseBalanceLike, UseDisconnectLike, UseReadContractLike
UseSignMessageLike, UseSolanaAccountLike, UseSolanaSendSOLLike
UseSolanaSignMessageLike, UseSwitchChainLike, UseWriteContractLike
WalletAdapterChain

# Ethereum context types (internal plumbing)
ChainId, SetChainResult
```

If any internal file imports these from `index.ts` instead of the source file, fix that import to use the source path directly.

**Verify:** `pnpm check` passes.

---

## Phase 2: Consolidate Error Exports

The published API has: `OpenfortError`, `OpenfortErrorType` (alias of `OpenfortReactErrorType`).
The local code adds: `OpenfortReactError`, `OpenfortErrorCode`, `OpenfortTransactionError`, `TransactionErrorCode`.

**Problem:** Two error systems exported simultaneously confuses developers.

**Action — keep BOTH for now, mark legacy as deprecated:**

1. Add `@deprecated Use OpenfortReactError instead` JSDoc to the `OpenfortError` export line
2. Add `@deprecated Use OpenfortErrorCode instead` JSDoc to the `OpenfortErrorType` export line
3. Keep all new error exports: `OpenfortReactError`, `OpenfortErrorCode`, `OpenfortTransactionError`, `TransactionErrorCode`
4. Delete the dead `_WalletError` class from `core/errors.ts` (never exported, never used)

**Why not delete legacy errors?** They're in the published API (v0.2.7). Removing them is a breaking change. Deprecate now, remove in next major.

**Verify:** `pnpm check` passes.

---

## Phase 3: Clean Deprecated Hook Exports

These hooks were added locally with `@deprecated` JSDoc but never shipped. Since they've never been public, we can remove them outright:

```
# New exports that are already deprecated — just remove
useAccount, UseAccountReturnType          # replaced by useConnectedWallet / useEthereumAccount
useAccountBalance, UseAccountBalanceReturnType  # replaced by useEthereumBalance / useSolanaBalance
useDisconnect, UseDisconnectReturnType    # replaced by useSignOut + useEthereumDisconnect
useSwitchChain, UseSwitchChainReturnType  # replaced by useEthereumSwitchChain
```

These were never in the published v0.2.7, so removing them is NOT a breaking change.

Check playground and internal components for imports of these hooks. If any use them, refactor to the replacement.

**Verify:** `pnpm check` passes, playground compiles.

---

## Phase 4: Clean Remaining Junk Exports

These are in the published API but provide zero value. Deprecate, don't remove:

| Export | Action | Reason |
|--------|--------|--------|
| `wallets` | Add `@deprecated` comment | Literally `{}` empty object |
| `OPENFORT_VERSION` | Remove from exports | Never used externally, still available internally |
| `PageLayout`, `PageLayoutProps` | Remove from exports | Internal layout component, never shipped the type |
| `CountryData`, `CountryIso2`, `CountrySelectorProps` | Remove from exports | Re-exports from `react-international-phone` — not our types |

Note: `PageLayout` IS in the published API but is an internal component. Remove it since v0.2.7 is unpublished/pre-release. If you want to be safe, add `@deprecated` instead.

**Verify:** `pnpm check` passes.

---

## Phase 5: Keep Established Names — No Renames

The published API already has these aliases. **Do NOT change them** — they match blog posts, docs, and what developers know:

| Export | Real name | Keep as-is? |
|--------|-----------|-------------|
| `useOpenfort` | `useOpenfortCore` | YES — `useOpenfort` matches docs and RN SDK |
| `AuthProvider` | `UIAuthProvider` | YES — `AuthProvider` matches blog posts |
| `OpenfortErrorType` | `OpenfortReactErrorType` | YES (deprecated) — keep for compat |
| `OpenfortOptions` | `ConnectUIOptions` | YES — `OpenfortOptions` matches published API |

These aliases are correct DX. The source names are internal. Don't touch them.

---

## Phase 6: Verify New Exports Are Complete

These new exports are good and should stay:

**Core hooks (chain-agnostic):**
`useConnectedWallet`, `useEmbeddedWallet`, `useChain`, `useConnectUI`, `useTransactionFlow`

**Embedded wallet hooks (per-chain, canonical names per D13):**
`useEthereumEmbeddedWallet`, `useSolanaEmbeddedWallet`

**Wallet adapter hooks (per-chain):**
`useEthereumAccount`, `useEthereumBalance`, `useEthereumDisconnect`, `useEthereumReadContract`, `useEthereumSignMessage`, `useEthereumSwitchChain`, `useEthereumWriteContract`, `useSolanaAccount`, `useSolanaBalance`, `useSolanaDisconnect`, `useSolanaSignMessage`, `useSolanaWriteContract`

**Solana-specific:**
`useSolanaSendTransaction`, `useSolanaMessageSigner`, `useSolanaSigner`

**Bridge (wagmi interop):**
`useEthereumBridge` + bridge types (`OpenfortEthereumBridgeConnector`, `OpenfortEthereumBridgeValue`, `OpenfortEthereumBridgeAccount`, `OpenfortEthereumBridgeChain`, `OpenfortEthereumBridgeConfig`, `OpenfortEthereumBridgeSwitchChain`)

**Utilities:**
`formatAddress`, `formatBalance`, `formatEther`, `formatSol`, `formatEVMAddress`, `formatSolanaAddress`, `truncateEthAddress`, `truncateSolanaAddress`, `getExplorerUrl`, `isValidEvmAddress`, `isValidSolanaAddress`, `createSIWEMessage`, `embeddedAccountToUserWallet`, `embeddedAccountToSolanaUserWallet`

**Types:**
`ConnectedWalletState`, `ConnectedWalletStatus`, `WalletType`, `EmbeddedWalletState`, `ConnectedEmbeddedEthereumWallet`, `EthereumUserWallet`, `SolanaUserWallet`, `SolanaConfig`, `ConnectUIValue`, `BalanceState` (if exported), `TransactionFlowStatus`, `UseTransactionFlowResult`, `SolanaSendTransactionStatus`, `UseSolanaSendTransactionResult`, `ExplorerUrlOptions`

**Check:** Is `ConnectedEmbeddedSolanaWallet` exported? If not, add it for EVM/SVM parity.

---

## Phase 7: Verify & Commit

1. `pnpm check` — must pass
2. `pnpm test` — must pass
3. `pnpm --filter playground dev` — playground must compile and run
4. Count total exports — target: ~90 (down from ~150)
5. Commit: `refactor(exports): clean public API surface for v0.3.0`

---

## Rules

- **Never rename established exports** (the 56 from v0.2.7)
- **Search before removing:** `grep -rn "importName" packages/` to find internal usages
- **Fix broken internal imports** — if an internal component imported from `index.ts`, change it to import from the source file directly
- **Don't refactor hook internals** — only the export surface
- **One commit per phase** if you want incremental review, or squash into one
- **Run `pnpm check` after each phase**
