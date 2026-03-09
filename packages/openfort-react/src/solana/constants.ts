/** System Program's Transfer instruction index (SystemInstruction enum variant 2). */
export const TRANSFER_INSTRUCTION_INDEX = 2
export const LAMPORTS_PER_SOL = BigInt(1_000_000_000)
/**
 * Solana System Program address.
 * Not exported by @solana/kit v5 directly — defined here as a typed constant.
 * Source: https://docs.solana.com/developing/runtime-facilities/programs#system-program
 */
export const SYSTEM_PROGRAM_ADDRESS = '11111111111111111111111111111111'
/**
 * Base fee per signature (5,000 lamports). Does NOT include priority fees,
 * which should be estimated dynamically via getPriorityFeeEstimate.
 * See https://helius.dev/blog/solana-fees-in-theory-and-practice
 */
export const BASE_FEE_LAMPORTS = BigInt(5000)
/**
 * Rent-exempt minimum for a zero-data system account (0 bytes of data).
 * Derived from (128 + 0) bytes * 3,480 lamports/byte-year * 2 years = 890,880 lamports.
 * For accounts with data, use getMinimumBalanceForRentExemption RPC call instead.
 */
export const RENT_EXEMPT_MINIMUM_LAMPORTS = BigInt(890_880)
