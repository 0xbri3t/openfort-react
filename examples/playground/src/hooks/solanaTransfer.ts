/**
 * Playground-only: SOL transfer instruction and helpers for useSolanaSendTransaction.
 */

import { address } from '@solana/kit'

const TRANSFER_INSTRUCTION_INDEX = 2

export function createTransferSolInstruction(
  from: string,
  to: string,
  lamports: bigint
): {
  programAddress: ReturnType<typeof address>
  data: Uint8Array
  accounts: Array<{ address: ReturnType<typeof address>; role: number }>
} {
  const SYSTEM_PROGRAM_ADDRESS = address('11111111111111111111111111111111')
  const data = new Uint8Array(12)
  const view = new DataView(data.buffer)
  view.setUint32(0, TRANSFER_INSTRUCTION_INDEX, true)
  view.setBigUint64(4, lamports, true)
  return {
    programAddress: SYSTEM_PROGRAM_ADDRESS,
    data,
    accounts: [
      { address: address(from), role: 3 },
      { address: address(to), role: 1 },
    ],
  }
}

export function toUint8Array(bytes: unknown): Uint8Array {
  if (bytes instanceof Uint8Array) return bytes
  if (ArrayBuffer.isView(bytes)) return new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  if (Symbol.iterator in Object(bytes)) return Uint8Array.from(bytes as Iterable<number>)
  throw new Error(`Cannot convert ${typeof bytes} to Uint8Array`)
}

export function unwrapTransactionSignature(result: unknown): string | undefined {
  const value =
    typeof result === 'object' && result !== null && 'valueOf' in result
      ? (result as { valueOf(): unknown }).valueOf()
      : result
  if (value === undefined || value === null) return undefined
  if (typeof value !== 'string') throw new Error(`Unexpected transaction result type: ${typeof value}`)
  return value || undefined
}
