import { ChainTypeEnum, getExplorerUrl, useEVMAccount, useEVMReadContract, useEVMWriteContract } from '@openfort/react'
import type { ReactNode } from 'react'
import { formatUnits, getAddress } from 'viem'
import { Button } from '@/components/Showcase/ui/Button'
import { InputMessage } from '@/components/Showcase/ui/InputMessage'
import { TruncatedText } from '@/components/TruncatedText'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/cn'

const CONTRACT_ADDRESS = '0xef147ed8bb07a2a0e7df4c1ac09e96dec459ffac' as const
const BALANCE_ABI = [
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
] as const

export const WriteContractCardEVM = ({ tooltip }: { tooltip?: { hook: string; body: ReactNode } }) => {
  const { address, chainId } = useEVMAccount()

  const {
    data: balance,
    refetch,
    error: balanceError,
  } = useEVMReadContract({
    address: CONTRACT_ADDRESS,
    abi: [...BALANCE_ABI],
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: chainId,
  })

  const { data: hash, writeContract, isPending, error } = useEVMWriteContract()

  async function submit({ amount }: { amount: string }) {
    if (!address) return
    await writeContract({
      address: getAddress(CONTRACT_ADDRESS),
      abi: [
        {
          type: 'function',
          name: 'mint',
          inputs: [
            { name: 'to', type: 'address' },
            { name: 'amount', type: 'uint256' },
          ],
          outputs: [],
        },
      ],
      functionName: 'mint',
      args: [address, BigInt(amount) * BigInt(10 ** 18)],
    })
    setTimeout(refetch, 100)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Write Contract</CardTitle>
        <CardDescription>Interact with smart contracts on the blockchain.</CardDescription>
        <CardDescription>
          Contract Address: <TruncatedText text={CONTRACT_ADDRESS} />
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
