import {
  ChainTypeEnum,
  getExplorerUrl,
  useEthereumAccount,
  useEthereumReadContract,
  useEthereumWriteContract,
} from '@openfort/react'
import { type ReactNode, useEffect } from 'react'
import { formatUnits, getAddress } from 'viem'
import { Button } from '@/components/Showcase/ui/Button'
import { InputMessage } from '@/components/Showcase/ui/InputMessage'
import { TruncatedText } from '@/components/TruncatedText'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/cn'

const _POLYGON_BALANCE_ABI = [
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
] as const

const BEAM_CLAIM_ABI = [
  {
    name: 'claim',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      {
        name: 'amount',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    outputs: [],
  },
] as const

const _CHAIN_NAMES: Record<number, string> = {
  13337: 'Beam Testnet',
  80002: 'Polygon Amoy',
  84532: 'Base Sepolia',
}

export const WriteContractCardEVM = ({ tooltip }: { tooltip?: { hook: string; body: ReactNode } }) => {
  const { address, chainId } = useEthereumAccount()
  useEffect(() => {
    if (chainId != null) {
    }
  }, [chainId])

  const {
    data: balance,
    refetch,
    error: balanceError,
  } = useEthereumReadContract({
    address: import.meta.env.VITE_BEAM_MINT_CONTRACT!,
    abi: BEAM_CLAIM_ABI,
    functionName: 'claim',
    args: address ? [address] : undefined,
    chainId: chainId,
  })

  const { data: hash, writeContract, isPending, error } = useEthereumWriteContract()

  async function submit({ amount }: { amount: string }) {
    if (!address) return
    await writeContract({
      address: getAddress(import.meta.env.VITE_BEAM_MINT_CONTRACT!),
      abi: BEAM_CLAIM_ABI,
      functionName: 'claim',
      args: [BigInt(amount) * BigInt(10 ** 18)],
    })
    setTimeout(refetch, 100)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Write Contract</CardTitle>
        <CardDescription>Interact with smart contracts on the blockchain.</CardDescription>
        <CardDescription>
          Contract Address: <TruncatedText text={import.meta.env.VITE_BEAM_MINT_CONTRACT!} />
        </CardDescription>
        <CardDescription>
          Balance: {balanceError ? '-' : formatUnits((balance as bigint) ?? 0n, 18) || 0}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault()
            const amount = (e.target as HTMLFormElement).amount.value || '1'
            submit({ amount })
          }}
        >
          <label className={cn('input w-full')}>
            <input
              type="number"
              placeholder="Enter amount to mint"
              className="grow peer placeholder:text-muted-foreground"
              name="amount"
            />
          </label>
          {tooltip ? (
            <Tooltip delayDuration={500}>
              <TooltipTrigger asChild>
                <div className="w-full">
                  <Button className="btn btn-accent w-full" disabled={isPending || !address}>
                    {isPending ? 'Minting...' : 'Mint Tokens'}
                  </Button>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top">
                <h3 className="text-base mb-1">{tooltip.hook}</h3>
                {tooltip.body}
              </TooltipContent>
            </Tooltip>
          ) : (
            <Button className="btn btn-accent w-full" disabled={isPending || !address}>
              {isPending ? 'Minting...' : 'Mint Tokens'}
            </Button>
          )}
          <InputMessage message={`Transaction hash: ${hash}`} show={!!hash} variant="success" />
          {hash && chainId && (
            <a
              href={getExplorerUrl(ChainTypeEnum.EVM, { chainId, txHash: hash })}
              target="_blank"
              rel="noopener noreferrer"
              className="underline text-blue-400"
            >
              View on Explorer
            </a>
          )}
          <InputMessage message={error ? `Error: ${error.message}` : ''} show={!!error} variant="error" />
        </form>
      </CardContent>
    </Card>
  )
}
