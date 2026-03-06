import { getMinimumBalanceForRentExemption } from '@solana/kit'

export const TRANSFER_INSTRUCTION_INDEX = 2
export const LAMPORTS_PER_SOL = BigInt(1_000_000_000)
/** Estimated base fee for a simple transaction (5000 lamports). */
export const FEE_LAMPORTS = BigInt(5000)
/** Minimum lamports for a zero-data account to be rent-exempt, sourced from @solana/kit. */
export const RENT_EXEMPT_LAMPORTS = getMinimumBalanceForRentExemption(BigInt(0))
