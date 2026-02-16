import { ChainTypeEnum, getExplorerUrl, useEthereumBridge } from '@openfort/react'
import type { ReactNode } from 'react'
import { formatUnits, getAddress, parseAbi } from 'viem'
import { useChainId, useReadContract, useWriteContract } from 'wagmi'
import { Button } from '@/components/Showcase/ui/Button'
import { InputMessage } from '@/components/Showcase/ui/InputMessage'
import { TruncatedText } from '@/components/TruncatedText'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/cn'
import { getMintContractConfig } from '@/lib/contracts'

const BALANCE_ABI = [
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
] as const

export const WriteContractCard = ({ tooltip }: { tooltip?: { hook: string; body: ReactNode } }) => {
  const bridge = useEthereumBridge()
  const address = bridge?.account.address
  const chainId = useChainId()
  const config = getMintContractConfig(chainId)

  const {
    data: balance,
    refetch,
    error: balanceError,
  } = useReadContract({
    address: (config?.address ?? undefined) as `0x${string}` | undefined,
    abi: BALANCE_ABI,
    functionName: 'balanceOf',
    args: config && address ? [address] : undefined,
  })

  const {
    data: hash,
    isPending,
    writeContract,
    error,
  } = useWriteContract({
    mutation: {
      onSuccess: () => {
        setTimeout(() => {
          refetch()
        }, 100)
      },
    },
  })

  async function submit({ amount }: { amount: string }) {
    if (!config?.address) return
    const amountWei = BigInt(amount) * BigInt(10 ** 18)
    if (config.type === 'claim') {
      writeContract({
        address: getAddress(config.address),
        abi: parseAbi(['function claim(uint256 amount)']),
        functionName: 'claim',
        args: [amountWei],
      })
    } else {
      writeContract({
        address: getAddress(config.address),
        abi: parseAbi(['function mint(address to, uint256 amount)']),
        functionName: 'mint',
        args: [address!, amountWei],
      })
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Write Contract</CardTitle>
        <CardDescription>Interact with smart contracts on the blockchain.</CardDescription>
        <CardDescription>
          Contract Address: <TruncatedText text={config?.address ?? ''} />
        </CardDescription>
        <CardDescription>Balance: {balanceError ? '-' : formatUnits(balance || 0n, 18) || 0}</CardDescription>
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
                  <Button className="btn btn-accent w-full" disabled={isPending || !address || !config}>
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
            <Button className="btn btn-accent w-full" disabled={isPending || !address || !config}>
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
          <InputMessage message={`Error: ${error?.message}`} show={!!error} variant="error" />
        </form>
      </CardContent>
    </Card>
  )
}
