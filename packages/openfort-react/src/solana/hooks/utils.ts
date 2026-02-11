/**
 * Solana Hook Utilities
 *
 * Shared utilities for Solana wallet hooks.
 */

/** Recovery options for Solana (alias for shared RecoveryOptions) */
export type { RecoveryOptions as SolanaRecoveryOptions } from '../../shared/utils/recovery'
export { buildRecoveryParams } from '../../shared/utils/recovery'

/**
 * Format lamports to SOL
 */
export function lamportsToSol(lamports: bigint): number {
  return Number(lamports) / 1_000_000_000
}

/**
 * Format SOL to lamports
 */
export function solToLamports(sol: number): bigint {
  return BigInt(Math.floor(sol * 1_000_000_000))
}

/**
 * LAMPORTS_PER_SOL constant (1 SOL = 1 billion lamports)
 */
export const LAMPORTS_PER_SOL = BigInt(1_000_000_000)
