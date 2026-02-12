/**
 * Address validation utilities (dependency-free).
 *
 * openfort-js does not export address validation. The solana-sample example
 * (openfort-js/examples/apps/solana-sample) uses @solana/kit's address() in a
 * try/catch for Solana. We keep this shared util dependency-free so that
 * consumers that don't use @solana/kit (e.g. EVM-only apps) don't pull it in.
 * For stricter Solana validation when @solana/kit is available, use
 * address(addr) from '@solana/kit' in a try/catch. React-native package has no
 * shared address validation (no Send UI with recipient field in the repo).
 */

const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'

function isValidBase58Character(c: string): boolean {
  return BASE58_ALPHABET.includes(c)
}

/**
 * Validates a Solana address (Base58, 32–44 characters).
 */
export function isValidSolanaAddress(address: string): boolean {
  if (typeof address !== 'string' || address.length < 32 || address.length > 44) {
    return false
  }
  return address.split('').every(isValidBase58Character)
}

const EVM_ADDRESS_REGEX = /^0x[0-9a-fA-F]{40}$/

/**
 * Validates an EVM address (0x-prefixed 40 hex characters).
 */
export function isValidEvmAddress(address: string): boolean {
  return typeof address === 'string' && EVM_ADDRESS_REGEX.test(address)
}
