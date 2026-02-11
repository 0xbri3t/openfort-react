export type { RecoveryOptions as SolanaRecoveryOptions } from '../../shared/utils/recovery'
export { buildRecoveryParams } from '../../shared/utils/recovery'

export function lamportsToSol(lamports: bigint): number {
  return Number(lamports) / 1_000_000_000
}

export function solToLamports(sol: number): bigint {
  return BigInt(Math.floor(sol * 1_000_000_000))
}

export const LAMPORTS_PER_SOL = BigInt(1_000_000_000)
