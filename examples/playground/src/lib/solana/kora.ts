import type { OpenfortEmbeddedSolanaWalletProvider } from '@openfort/react/solana'
import {
  type Address,
  appendTransactionMessageInstructions,
  type Blockhash,
  createNoopSigner,
  createTransactionMessage,
  getBase64EncodedWireTransaction,
  type Instruction,
  type MicroLamports,
  partiallySignTransactionMessageWithSigners,
  type SignatureBytes,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
} from '@solana/kit'
import { KoraClient } from '@solana/kora'
import {
  updateOrAppendSetComputeUnitLimitInstruction,
  updateOrAppendSetComputeUnitPriceInstruction,
} from '@solana-program/compute-budget'
import { Base58 } from 'ox'

const COMPUTE_UNIT_LIMIT = 200_000
const COMPUTE_UNIT_PRICE = 1_000_000n as MicroLamports

interface KoraConfig {
  rpcUrl: string
  apiKey: string
}

interface SendGaslessTransactionParams {
  from: Address
  to: Address
  amountInSol: number
  provider: OpenfortEmbeddedSolanaWalletProvider
  koraConfig: KoraConfig
}

interface GaslessTransactionResult {
  signature: string
  success: boolean
  error?: string
}

function buildTransactionMessage(
  feePayer: ReturnType<typeof createNoopSigner>,
  blockhash: string,
  instructions: Instruction[]
) {
  const msg = createTransactionMessage({ version: 0 })
  const withPayer = setTransactionMessageFeePayerSigner(feePayer, msg)
  const withLifetime = setTransactionMessageLifetimeUsingBlockhash(
    { blockhash: blockhash as Blockhash, lastValidBlockHeight: 0n },
    withPayer
  )
  const withPrice = updateOrAppendSetComputeUnitPriceInstruction(COMPUTE_UNIT_PRICE, withLifetime)
  const withLimit = updateOrAppendSetComputeUnitLimitInstruction(COMPUTE_UNIT_LIMIT, withPrice)
  return appendTransactionMessageInstructions(instructions, withLimit)
}

export async function sendGaslessSolTransaction({
  from,
  to,
  amountInSol,
  provider,
  koraConfig,
}: SendGaslessTransactionParams): Promise<GaslessTransactionResult> {
  try {
    const client = new KoraClient({
      rpcUrl: koraConfig.rpcUrl,
      apiKey: koraConfig.apiKey,
    })

    const { signer_address } = await client.getPayerSigner()
    const koraNoopSigner = createNoopSigner(signer_address as Address)

    const transferLamports = Math.floor(amountInSol * 1_000_000_000)
    const transferSol = await client.transferTransaction({
      amount: transferLamports,
      token: '11111111111111111111111111111111',
      source: from,
      destination: to,
      signer_key: signer_address,
    })

    const { blockhash } = await client.getBlockhash()
    const transaction = buildTransactionMessage(koraNoopSigner, blockhash, transferSol.instructions)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const partiallySignedTx = await partiallySignTransactionMessageWithSigners(transaction as any)

    const result = await provider.signTransaction(new Uint8Array(partiallySignedTx.messageBytes))
    let signatureBytes = Base58.toBytes(result.signature)
    if (signatureBytes.length === 65) {
      signatureBytes = signatureBytes.slice(0, 64)
    }

    const userSignedTx = {
      ...partiallySignedTx,
      signatures: {
        ...partiallySignedTx.signatures,
        [from]: signatureBytes as SignatureBytes,
      },
    }
    const userSignedWire = getBase64EncodedWireTransaction(userSignedTx)

    const response = await client.signAndSendTransaction({
      transaction: userSignedWire,
      signer_key: signer_address,
    })

    // The Kora proxy may not return `signature` directly.
    // Extract it from the signed_transaction: first 64 bytes after the
    // compact-array length prefix are the fee-payer's (Kora's) signature,
    // which is the canonical tx signature on Solana.
    let txSignature = (response as Record<string, unknown>).signature as string | undefined
    if (!txSignature) {
      const signedTxB64 = (response as Record<string, unknown>).signed_transaction as string | undefined
      if (signedTxB64) {
        const wireBytes = Uint8Array.from(atob(signedTxB64), (c) => c.charCodeAt(0))
        // Wire format: [num_signatures (1 byte), ...signatures (64 bytes each), ...]
        // First signature (bytes 1..65) is the tx signature
        const firstSig = wireBytes.slice(1, 65)
        txSignature = Base58.fromBytes(firstSig)
      }
    }

    return { signature: txSignature ?? '', success: true }
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : typeof error === 'object' && error !== null
          ? JSON.stringify(error)
          : String(error)
    return {
      signature: '',
      success: false,
      error: message,
    }
  }
}
