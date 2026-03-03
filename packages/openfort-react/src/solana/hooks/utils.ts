import { LAMPORTS_PER_SOL } from '../constants'

export function solToLamports(sol: number): bigint {
  return BigInt(Math.floor(sol * Number(LAMPORTS_PER_SOL)))
}

export function formatSol(lamports: bigint, decimals = 4): string {
  return (Number(lamports) / Number(LAMPORTS_PER_SOL)).toFixed(decimals)
}
