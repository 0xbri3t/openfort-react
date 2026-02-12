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
