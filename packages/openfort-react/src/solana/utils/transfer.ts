import { address } from '@solana/kit'
import { TRANSFER_INSTRUCTION_INDEX } from '../constants'

const SYSTEM_PROGRAM_ADDRESS = address('11111111111111111111111111111111')

export function createTransferSolInstruction(
  from: string,
  to: string,
  lamports: bigint
): {
  programAddress: ReturnType<typeof address>
  data: Uint8Array
  accounts: Array<{ address: ReturnType<typeof address>; role: number }>
} {
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
