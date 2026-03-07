import { AccountRole, address } from '@solana/kit'
import { SYSTEM_PROGRAM_ADDRESS, TRANSFER_INSTRUCTION_INDEX } from '../constants'

export function createTransferSolInstruction(
  from: string,
  to: string,
  lamports: bigint
): {
  programAddress: ReturnType<typeof address>
  data: Uint8Array
  accounts: Array<{ address: ReturnType<typeof address>; role: AccountRole }>
} {
  const data = new Uint8Array(12)
  const view = new DataView(data.buffer)
  view.setUint32(0, TRANSFER_INSTRUCTION_INDEX, true)
  view.setBigUint64(4, lamports, true)
  return {
    programAddress: address(SYSTEM_PROGRAM_ADDRESS),
    data,
    accounts: [
      { address: address(from), role: AccountRole.WRITABLE_SIGNER },
      { address: address(to), role: AccountRole.WRITABLE },
    ],
  }
}
