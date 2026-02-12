import { LAMPORTS_PER_SOL } from '../constants'

export function lamportsToSol(lamports: bigint): number {
  return Number(lamports) / Number(LAMPORTS_PER_SOL)
}

export function solToLamports(sol: number): bigint {
  return BigInt(Math.floor(sol * Number(LAMPORTS_PER_SOL)))
}

export { LAMPORTS_PER_SOL }
