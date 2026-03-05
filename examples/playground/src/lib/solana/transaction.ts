import type { OpenfortEmbeddedSolanaWalletProvider } from '@openfort/react/solana'
import {
  type Address,
  appendTransactionMessageInstruction,
  assertIsTransactionWithBlockhashLifetime,
  createSolanaRpc,
  createSolanaRpcSubscriptions,
  createTransactionMessage,
  lamports,
  pipe,
  type SignatureBytes,
  type SignatureDictionary,
  sendAndConfirmTransactionFactory,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
  signTransactionMessageWithSigners,
  type TransactionSigner,
} from '@solana/kit'
import { getTransferSolInstruction } from '@solana-program/system'
import { Base58 } from 'ox'

interface SendTransactionParams {
  from: Address
  to: Address
  amountInSol: number
  provider: OpenfortEmbeddedSolanaWalletProvider
  rpcUrl?: string
}

interface TransactionResult {
  signature: string
  success: boolean
  error?: string
}

function deriveWssUrl(rpcUrl: string): string {
  try {
    const parsed = new URL(rpcUrl)
    const hostname = parsed.hostname
    if (hostname === 'openfort.io' || hostname.endsWith('.openfort.io')) {
      return 'wss://api.devnet.solana.com'
    }
  } catch {
    // If rpcUrl is not a valid URL, fall back to the replacement logic below.
  }
  return rpcUrl.replace(/^https?:\/\//, 'wss://')
}

function createProviderSigner(
  signerAddress: Address,
  provider: OpenfortEmbeddedSolanaWalletProvider
): TransactionSigner {
  return {
    address: signerAddress,
    signTransactions: async (transactions): Promise<readonly SignatureDictionary[]> => {
      return Promise.all(
        transactions.map(async (transaction) => {
          const result = await provider.signTransaction({
            messageBytes: new Uint8Array(transaction.messageBytes),
          })
          let signatureBytes = Base58.toBytes(result.signature)
          if (signatureBytes.length === 65) {
            signatureBytes = signatureBytes.slice(0, 64)
          } else if (signatureBytes.length !== 64) {
            throw new Error(
              `Invalid signature length: expected 64 bytes for Ed25519, got ${signatureBytes.length} bytes`
            )
          }
          return Object.freeze({
            [signerAddress]: signatureBytes as SignatureBytes,
          })
        })
      )
    },
  }
}

export async function sendSolTransaction({
  from,
  to,
  amountInSol,
  provider,
  rpcUrl,
}: SendTransactionParams): Promise<TransactionResult> {
  const httpUrl = rpcUrl ?? 'https://api.devnet.solana.com'
  const rpc = createSolanaRpc(httpUrl)
  const rpcSubscriptions = createSolanaRpcSubscriptions(deriveWssUrl(httpUrl))

  try {
    const signer = createProviderSigner(from, provider)
    const { value: latestBlockhash } = await rpc.getLatestBlockhash().send()

    const transactionMessage = pipe(
      createTransactionMessage({ version: 0 }),
      (tx) => setTransactionMessageFeePayer(from, tx),
      (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
      (tx) =>
        appendTransactionMessageInstruction(
          getTransferSolInstruction({
            source: signer,
            destination: to,
            amount: lamports(BigInt(Math.floor(amountInSol * 1_000_000_000))),
          }),
          tx
        )
    )

    const signedTransaction = await signTransactionMessageWithSigners(transactionMessage)
    assertIsTransactionWithBlockhashLifetime(signedTransaction)

    const sendAndConfirmTransaction = sendAndConfirmTransactionFactory({
      rpc,
      rpcSubscriptions,
    })
    await sendAndConfirmTransaction(signedTransaction, { commitment: 'confirmed' })

    const sigBytes = Object.values(signedTransaction.signatures)[0]
    const signature = sigBytes ? Base58.fromBytes(sigBytes) : ''
    return { signature, success: true }
  } catch (error) {
    return {
      signature: '',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
