/**
 * Format Utilities
 *
 * Address formatting utilities for different chain types.
 */

import { ChainTypeEnum } from '@openfort/openfort-js'

const EVM_TRUNCATE_REGEX = /^(0x[a-zA-Z0-9]{4})[a-zA-Z0-9]+([a-zA-Z0-9]{4})$/

/**
 * Format EVM address: 0x1234...abcd
 */
export function formatEVMAddress(address: string): string {
  if (!address || address.length < 10) return address
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

/**
 * Format Solana address: ABC1...XYZ9
 */
export function formatSolanaAddress(address: string): string {
  if (!address || address.length < 8) return address
  return `${address.slice(0, 4)}...${address.slice(-4)}`
}

/**
 * Truncate EVM address with configurable separator (regex-based for 0x format).
 */
export function truncateEthAddress(address?: string, separator = '••••'): string {
  if (!address) return ''
  const match = address.match(EVM_TRUNCATE_REGEX)
  if (!match) return address
  return `${match[1]}${separator}${match[2]}`
}

/**
 * Truncate Solana address with configurable separator.
 */
export function truncateSolanaAddress(address?: string, separator = '••••'): string {
  if (!address) return ''
  if (address.length <= 14) return address
  return `${address.slice(0, 6)}${separator}${address.slice(-4)}`
}

const addressFormatters: Record<ChainTypeEnum, (address: string) => string> = {
  [ChainTypeEnum.EVM]: formatEVMAddress,
  [ChainTypeEnum.SVM]: formatSolanaAddress,
}

/**
 * Format address based on chain type
 */
export function formatAddress(address: string, chainType: ChainTypeEnum): string {
  const formatter = addressFormatters[chainType]
  return formatter(address)
}

/**
 * Format balance with specified decimals
 */
export function formatBalance(value: bigint, decimals: number, maxDecimals = 4): string {
  const divisor = BigInt(10 ** decimals)
  const integerPart = value / divisor
  const fractionalPart = value % divisor

  // Convert fractional to string with leading zeros
  const fractionalStr = fractionalPart.toString().padStart(decimals, '0')

  // Trim to maxDecimals and remove trailing zeros
  const trimmed = fractionalStr.slice(0, maxDecimals).replace(/0+$/, '')

  return trimmed ? `${integerPart}.${trimmed}` : integerPart.toString()
}

/**
 * Format ETH balance (18 decimals)
 */
export function formatEther(value: bigint, maxDecimals = 4): string {
  return formatBalance(value, 18, maxDecimals)
}

/**
 * Format SOL balance (9 decimals)
 */
export function formatSol(value: bigint, maxDecimals = 4): string {
  return formatBalance(value, 9, maxDecimals)
}
