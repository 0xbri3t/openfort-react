import { LAMPORTS_PER_SOL } from '../constants'

export function solToLamports(sol: number): bigint {
  // Use toFixed(9) to avoid scientific notation (e.g. 1e-9) for small values
  const str = sol.toFixed(9)
  const [whole = '0', frac = ''] = str.split('.')
  const padded = frac.slice(0, 9)
  return BigInt(whole) * LAMPORTS_PER_SOL + BigInt(padded)
}

export function formatSol(lamports: bigint, decimals = 4): string {
  const whole = lamports / LAMPORTS_PER_SOL
  const remainder = lamports % LAMPORTS_PER_SOL
  const fracStr = remainder.toString().padStart(9, '0')
  return `${whole}.${fracStr}`.replace(new RegExp(`(\\d*\\.\\d{${decimals}})\\d*`), '$1')
}
