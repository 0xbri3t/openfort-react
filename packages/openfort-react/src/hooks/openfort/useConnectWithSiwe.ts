import { OpenfortError } from '@openfort/openfort-js'
import { AxiosError } from 'axios'
import { useCallback } from 'react'
import { useEVMBridge } from '../../core/OpenfortEVMBridgeContext'
import { useOpenfortCore } from '../../openfort/useOpenfort'
import { createSIWEMessage } from '../../siwe/create-siwe-message'
import { logger } from '../../utils/logger'

export function useConnectWithSiwe() {
  const { client, user, updateUser } = useOpenfortCore()
  const bridge = useEVMBridge()
  const address = bridge?.account?.address
  const connector = bridge?.account?.connector
  const chainId = bridge?.chainId ?? 0
  const accountChainId = bridge?.account?.chain?.id ?? bridge?.chainId
  const chainName = bridge?.account?.chain?.name
  const switchChainAsync = bridge?.switchChain?.switchChainAsync
  const signMessage = bridge?.signMessage

  const connectWithSiwe = useCallback(
    async ({
      onError,
      onConnect,
      address: propsAddress,
      connectorType: propsConnectorType,
      walletClientType: propsWalletClientType,
      link = !!user,
    }: {
      address?: `0x${string}`
      connectorType?: string
      walletClientType?: string
      onError?: (error: string, openfortError?: OpenfortError) => void
      onConnect?: () => void
      link?: boolean
    } = {}) => {
      const addressToUse = propsAddress ?? address
      const connectorType = propsConnectorType ?? connector?.type
      const walletClientType = propsWalletClientType ?? connector?.id

      if (!addressToUse || !connectorType || !walletClientType) {
        logger.log('No address found', { address: addressToUse, connectorType, walletClientType })
        onError?.('No address found')
        return
      }

      if (!signMessage) {
        onError?.('EVM bridge not available (signMessage)')
        return
      }

      try {
        if (accountChainId !== chainId && switchChainAsync) {
          await switchChainAsync({ chainId })
        }

        let nonce: string
        if (link) {
          const resp = await client.auth.initLinkSiwe({ address: addressToUse })
          nonce = resp.nonce
        } else {
          const resp = await client.auth.initSiwe({ address: addressToUse })
          nonce = resp.nonce
        }

        const SIWEMessage = createSIWEMessage(addressToUse, nonce, chainId)

        const signature = await signMessage({ message: SIWEMessage })

        if (link) {
          logger.log('Linking wallet to user')
          await client.auth.linkWithSiwe({
            signature,
            message: SIWEMessage,
            connectorType,
            walletClientType,
            address: addressToUse,
            chainId,
          })
        } else {
          logger.log('Authenticating with SIWE')
          await client.auth.loginWithSiwe({
            signature,
            message: SIWEMessage,
            connectorType,
            walletClientType,
            address: addressToUse,
          })
        }

        await updateUser()

        await Promise.resolve(onConnect?.())
      } catch (err) {
        logger.log('Failed to connect with SIWE', {
          error: err,
          status: err instanceof AxiosError ? err.request.status : 'unknown',
        })
        if (!onError) return

        let message = err instanceof Error ? err.message : String(err)

        if (message.includes('User rejected the request.')) {
          message = 'User rejected the request.'
        } else if (message.includes('Invalid signature')) {
          message = 'Invalid signature. Please try again.'
        } else if (message.includes('An error occurred when attempting to switch chain')) {
          message = `Failed to switch chain. Please switch your wallet to ${chainName ?? 'the correct network'} and try again.`
        } else {
          message = 'Failed to connect with SIWE.'
        }

        onError(message, err instanceof OpenfortError ? err : undefined)
      }
    },
    [client, user, updateUser, address, chainId, connector, accountChainId, chainName, switchChainAsync, signMessage]
  )

  return connectWithSiwe
}
