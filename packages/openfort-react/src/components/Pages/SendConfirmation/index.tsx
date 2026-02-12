/**
 * SendConfirmation Page
 *
 * Wagmi-free transaction confirmation page.
 * Uses viem-based hooks for balance, transactions, and receipts.
 */

import { ChainTypeEnum } from '@openfort/openfort-js'
import { useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { Address } from 'viem'
import { encodeFunctionData, isAddress, parseUnits } from 'viem'
import { TickIcon } from '../../../assets/icons'
import { erc20Abi } from '../../../constants/erc20'
import { EthereumContext } from '../../../ethereum/EthereumContext'
import { useEthereumSendTransaction } from '../../../ethereum/hooks/useEthereumSendTransaction'
import { useEthereumTokenBalance } from '../../../ethereum/hooks/useEthereumTokenBalance'
import { useEthereumWaitForTransactionReceipt } from '../../../ethereum/hooks/useEthereumWaitForTransactionReceipt'
import { useEthereumWriteContract } from '../../../ethereum/hooks/useEthereumWriteContract'
import { useWalletAssets } from '../../../hooks/openfort/useWalletAssets'
import { useBalance } from '../../../hooks/useBalance'
import { useConnectedWallet } from '../../../hooks/useConnectedWallet'
import { useChain } from '../../../shared/hooks/useChain'
import { getExplorerUrl } from '../../../shared/utils/explorer'
import { truncateEthAddress } from '../../../utils'
import { parseTransactionError } from '../../../utils/errorHandling'
import { logger } from '../../../utils/logger'
import { getChainName } from '../../../utils/rpc'
import Button from '../../Common/Button'
import { CopyText } from '../../Common/CopyToClipboard/CopyText'
import { ModalBody, ModalHeading } from '../../Common/Modal/styles'
import { routes } from '../../Openfort/types'
import { useOpenfort } from '../../Openfort/useOpenfort'
import { PageContent } from '../../PageContent'
import { getAssetDecimals, getAssetSymbol, isSameToken, sanitizeForParsing } from '../Send/utils'
import { EstimatedFees } from './EstimatedFees'
import {
  AddressValue,
  AmountValue,
  ButtonRow,
  CheckIconWrapper,
  ErrorAction,
  ErrorContainer,
  ErrorMessage,
  ErrorTitle,
  FeesValue,
  StatusMessage,
  SummaryItem,
  SummaryLabel,
  SummaryList,
} from './styles'

/** Check if chain is a testnet */
function isTestnetChain(chainId: number): boolean {
  const testnets = new Set([5, 11155111, 80001, 84532, 421614, 97, 4002])
  return testnets.has(chainId)
}

const SendConfirmation = () => {
  const wallet = useConnectedWallet()
  const { chainType } = useChain()
  const ethereumContext = useContext(EthereumContext)
  const { sendForm, setRoute, triggerResize, walletConfig } = useOpenfort()

  const address = wallet.status === 'connected' ? (wallet.address as `0x${string}`) : undefined
  const chainId = ethereumContext?.chainId

  // Build chain info for block explorer
  const chain = chainId
    ? {
        id: chainId,
        name: getChainName(chainId),
        blockExplorers: {
          default: {
            url: getExplorerUrl(ChainTypeEnum.EVM, { chainId }),
          },
        },
        testnet: isTestnetChain(chainId),
      }
    : undefined

  const recipientAddress = isAddress(sendForm.recipient) ? (sendForm.recipient as Address) : undefined
  const normalisedAmount = sanitizeForParsing(sendForm.amount)

  const { data: assets } = useWalletAssets()
  const matchedToken = useMemo(
    () => assets?.find((asset) => isSameToken(asset, sendForm.asset)),
    [assets, sendForm.asset]
  )

  const selectedTokenOption = matchedToken ?? assets?.[0]
  const token = selectedTokenOption ?? sendForm.asset

  const isErc20 = token.type === 'erc20'

  const nativeBalance = useBalance({
    address: address ?? '',
    chainType: wallet.status === 'connected' ? wallet.chainType : chainType,
    chainId: chainId ?? 80002,
    cluster: wallet.status === 'connected' && wallet.chainType === ChainTypeEnum.SVM ? wallet.cluster : 'devnet',
    enabled: !!address && !isErc20,
  })

  const refetchNativeBalance = nativeBalance.refetch

  // ERC20 balance using wagmi-free hook (skipped when native send; no placeholder address)
  const erc20Balance = useEthereumTokenBalance({
    tokenAddress: isErc20 ? (token.address as `0x${string}`) : undefined,
    ownerAddress: address,
    chainId: chainId ?? 80002,
    enabled: Boolean(isErc20 && address),
  })

  const refetchErc20Balance = erc20Balance.refetch

  const parsedAmount =
    normalisedAmount && token && getAssetDecimals(token) !== undefined
      ? (() => {
          try {
            return parseUnits(normalisedAmount, getAssetDecimals(token))
          } catch (_error) {
            return null
          }
        })()
      : null

  useEffect(() => {
    if (!recipientAddress || parsedAmount === null || parsedAmount <= BigInt(0)) {
      logger.log('INVALID - recipientAddress:', recipientAddress, 'parsedAmount:', parsedAmount)
      // setRoute(routes.SEND)
    }
  }, [recipientAddress, parsedAmount, setRoute])

  // Get current balance value from discriminated unions
  const nativeBalanceValue = nativeBalance.status === 'success' ? nativeBalance.value : undefined
  const erc20BalanceValue = erc20Balance.status === 'success' ? erc20Balance.value : undefined
  const currentBalance = isErc20 ? erc20BalanceValue : nativeBalanceValue
  const nativeSymbol = nativeBalance.status === 'success' ? nativeBalance.symbol : 'ETH'

  const insufficientBalance =
    parsedAmount !== null && currentBalance !== undefined ? parsedAmount > currentBalance : false

  // Track original balance and polling state
  const [isPollingBalance, setIsPollingBalance] = useState(false)
  const originalBalanceRef = useRef<bigint | undefined>(undefined)
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const {
    sendTransactionAsync,
    data: nativeTxHash,
    isPending: isNativePending,
    error: nativeError,
  } = useEthereumSendTransaction()
  const {
    writeContractAsync,
    data: erc20TxHash,
    isPending: isTokenPending,
    error: erc20Error,
  } = useEthereumWriteContract()

  const transactionHash = nativeTxHash ?? erc20TxHash

  const transferData =
    recipientAddress && parsedAmount !== null && parsedAmount > BigInt(0)
      ? token.type === 'erc20'
        ? encodeFunctionData({
            abi: erc20Abi,
            functionName: 'transfer',
            args: [recipientAddress, parsedAmount],
          })
        : undefined
      : undefined

  // Wait for transaction receipt using wagmi-free hook
  const receiptState = useEthereumWaitForTransactionReceipt({
    hash: transactionHash,
    chainId,
    enabled: Boolean(transactionHash),
  })

  const receipt = receiptState.status === 'success' ? receiptState.data : undefined
  const isWaitingForReceipt = receiptState.status === 'loading'
  const isSuccess = receiptState.status === 'success' && receiptState.isSuccess
  const waitError = receiptState.status === 'error' ? receiptState.error : null

  const isSubmitting = isNativePending || isTokenPending
  const isLoading = isSubmitting || isWaitingForReceipt

  const firstError = nativeError || erc20Error || waitError

  // Store original balance when transaction starts
  useEffect(() => {
    if (isSubmitting && originalBalanceRef.current === undefined) {
      originalBalanceRef.current = currentBalance
    }
  }, [isSubmitting, currentBalance])

  // Poll balance when transaction is successful until it changes
  useEffect(() => {
    if (isSuccess && originalBalanceRef.current !== undefined) {
      // Start polling
      setIsPollingBalance(true)

      const refetchBalance = isErc20 ? refetchErc20Balance : refetchNativeBalance

      // Immediate first refetch
      refetchBalance()

      // Set up interval for polling every 3 seconds
      pollingIntervalRef.current = setInterval(() => {
        refetchBalance()
      }, 3000)
    }

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }
    }
  }, [isSuccess, isErc20, refetchErc20Balance, refetchNativeBalance])

  // Stop polling when balance changes
  useEffect(() => {
    if (isPollingBalance && currentBalance !== undefined && originalBalanceRef.current !== undefined) {
      if (currentBalance !== originalBalanceRef.current) {
        setIsPollingBalance(false)
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current)
          pollingIntervalRef.current = null
        }
      }
    }
  }, [isPollingBalance, currentBalance])

  const handleConfirm = async () => {
    if (!recipientAddress || !parsedAmount || parsedAmount <= BigInt(0) || insufficientBalance) return

    try {
      if (token.type === 'native') {
        await sendTransactionAsync({
          to: recipientAddress,
          value: parsedAmount,
          chainId,
        })
      } else {
        await writeContractAsync({
          abi: erc20Abi,
          address: token.address as `0x${string}`,
          functionName: 'transfer',
          args: [recipientAddress, parsedAmount],
          chainId,
        })
      }
    } catch (_error) {
      // Errors are surfaced through mutation hooks
    }
  }

  const handleCancel = () => {
    // Keep the current token, amount, and recipient when going back - don't reset
    setRoute(routes.SEND)
  }

  const handleFinish = () => {
    // Clear polling interval if still running
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
      pollingIntervalRef.current = null
    }
    setIsPollingBalance(false)

    // Don't reset the form - keep amount, token, and recipient for easier repeat transactions
    setRoute(routes.CONNECTED)
  }

  const status: 'idle' | 'success' | 'error' = isSuccess ? 'success' : firstError ? 'error' : 'idle'
  const errorDetails = status === 'error' ? parseTransactionError(firstError) : null

  const blockExplorerUrl = chain?.blockExplorers?.default?.url

  const handleOpenBlockExplorer = () => {
    if (receipt?.transactionHash && blockExplorerUrl) {
      window.open(`${blockExplorerUrl}/tx/${receipt.transactionHash}`, '_blank', 'noopener,noreferrer')
    }
  }

  useEffect(() => {
    setTimeout(triggerResize, 10) // delay required here for modal to resize
  }, [errorDetails, insufficientBalance, receipt?.transactionHash, isLoading, triggerResize])

  const isSponsored = useMemo(() => {
    if (!walletConfig?.ethereumProviderPolicyId) return false
    if (typeof walletConfig.ethereumProviderPolicyId === 'string') return true
    return walletConfig.ethereumProviderPolicyId[chainId ?? 0] !== undefined
  }, [walletConfig?.ethereumProviderPolicyId, chainId])

  return (
    <PageContent>
      <ModalHeading>Confirm transfer</ModalHeading>
      <ModalBody>Review the transaction details before sending.</ModalBody>

      <SummaryList>
        <SummaryItem>
          <SummaryLabel>Sending</SummaryLabel>
          <AmountValue>
            {normalisedAmount || '0'} {getAssetSymbol(token)}
          </AmountValue>
        </SummaryItem>

        <SummaryItem>
          <SummaryLabel>From</SummaryLabel>
          <AddressValue>
            {address ? (
              <CopyText size="1rem" value={address}>
                {truncateEthAddress(address)}
              </CopyText>
            ) : (
              '--'
            )}
          </AddressValue>
        </SummaryItem>

        <SummaryItem>
          <SummaryLabel>To</SummaryLabel>
          <AddressValue>
            {recipientAddress ? (
              <CopyText size="1rem" value={recipientAddress}>
                {truncateEthAddress(recipientAddress)}
              </CopyText>
            ) : (
              '--'
            )}
          </AddressValue>
        </SummaryItem>

        <div>
          <SummaryItem>
            <SummaryLabel>Estimated fees</SummaryLabel>
            <FeesValue $completed={isSponsored}>
              <EstimatedFees
                account={address}
                to={token.type === 'erc20' ? (token.address as `0x${string}`) : recipientAddress}
                value={token.type === 'native' && parsedAmount ? parsedAmount : undefined}
                data={transferData}
                chainId={chainId}
                nativeSymbol={nativeSymbol}
                enabled={Boolean(address && recipientAddress && parsedAmount && parsedAmount > BigInt(0))}
                hideInfoIcon={isSponsored}
              />
              <CheckIconWrapper>
                <TickIcon />
              </CheckIconWrapper>
            </FeesValue>
          </SummaryItem>
          {isSponsored && (
            <div
              style={{
                textAlign: 'end',
                marginTop: '4px',
                width: '100%',
                color: 'var(--ck-body-color-valid)',
                fontSize: '12px',
              }}
            >
              Sponsored transaction
            </div>
          )}
        </div>
      </SummaryList>

      {insufficientBalance && !isSuccess && (
        <StatusMessage $status="error">Insufficient balance for this transfer.</StatusMessage>
      )}

      {errorDetails && (
        <ErrorContainer>
          <ErrorTitle>{errorDetails.title}</ErrorTitle>
          <ErrorMessage>{errorDetails.message}</ErrorMessage>
          {errorDetails.action && <ErrorAction>{errorDetails.action}</ErrorAction>}
        </ErrorContainer>
      )}

      <ButtonRow>
        <Button
          variant="primary"
          onClick={isSuccess ? handleOpenBlockExplorer : handleConfirm}
          disabled={
            isSuccess ? false : !recipientAddress || !parsedAmount || parsedAmount <= BigInt(0) || insufficientBalance
          }
          waiting={isLoading}
          icon={isSuccess ? <TickIcon style={{ width: 18, height: 18 }} /> : undefined}
        >
          {isSuccess ? 'Confirmed' : isLoading ? 'Confirming...' : 'Confirm'}
        </Button>
        {isSuccess ? (
          <Button variant="secondary" onClick={handleFinish}>
            Back to profile
          </Button>
        ) : (
          <Button variant="secondary" onClick={handleCancel} disabled={isLoading}>
            Cancel
          </Button>
        )}
      </ButtonRow>
    </PageContent>
  )
}

export default SendConfirmation
