import { useCallback, useEffect, useState } from 'react'
import type { OpenfortEVMBridgeConnector } from '../../../core/OpenfortEVMBridgeContext'
import { useEVMBridge } from '../../../core/OpenfortEVMBridgeContext'
import { useOpenfortCore } from '../../../openfort/useOpenfort'
import { OpenfortError, type OpenfortHookOptions, OpenfortReactErrorType } from '../../../types'
import { logger } from '../../../utils/logger'
import { useEVMConnectors } from '../../../wallets/useEVMConnectors'
import { onError, onSuccess } from '../hookConsistency'
import { useConnectWithSiwe } from '../useConnectWithSiwe'
import { type BaseFlowState, mapStatus } from './status'

type ConnectWalletOptions = {
  connector: OpenfortEVMBridgeConnector | string
} // onConnect is handled by the hookOptions because useConnect needs to finish the connection process

/**
 * @deprecated This hook requires wagmi as a peer dependency.
 *
 * For SIWE auth without wagmi, use the SDK directly:
 * ```ts
 * import { useCoreContext, createSIWEMessage } from '@openfort/react'
 *
 * const { client } = useCoreContext()
 * const { nonce } = await client.auth.initSiwe({ address })
 * const message = createSIWEMessage(address, nonce, chainId)
 * const signature = await yourWallet.signMessage(message)
 * await client.auth.loginWithSiwe({ signature, message, address, connectorType, walletClientType })
 * ```
 *
 * For wagmi convenience hooks, use @openfort/wagmi package (coming soon).
 */
export const useWalletAuth = (hookOptions: OpenfortHookOptions = {}) => {
  // Deprecation warning in development
  if (process.env.NODE_ENV !== 'production') {
    logger.warn(
      '[Openfort] useWalletAuth is deprecated. ' +
        'This hook requires wagmi. For SIWE auth without wagmi, use client.auth.loginWithSiwe() directly with createSIWEMessage(). ' +
        'For wagmi convenience, @openfort/wagmi package is coming soon.'
    )
  }

  const { updateUser } = useOpenfortCore()
  const bridge = useEVMBridge()
  const siwe = useConnectWithSiwe()
  const availableWallets = useEVMConnectors()
  const disconnect = bridge?.disconnect
  const [walletConnectingTo, setWalletConnectingTo] = useState<string | null>(null)
  const [shouldConnectWithSiwe, setShouldConnectWithSiwe] = useState(false)

  const [status, setStatus] = useState<BaseFlowState>({
    status: 'idle',
  })

  const handleError = useCallback(
    (error: OpenfortError) => {
      setWalletConnectingTo(null)
      setStatus({
        status: 'error',
        error,
      })
      return onError({
        error,
        hookOptions,
      })
    },
    [hookOptions]
  )

  const connectAsync = useCallback(
    async (params: { connector: OpenfortEVMBridgeConnector }) => {
      if (!bridge?.connectAsync) throw new Error('EVM bridge not available')
      try {
        await bridge.connectAsync(params)
        setShouldConnectWithSiwe(true)
      } catch (e) {
        const error = new OpenfortError('Failed to connect with wallet', OpenfortReactErrorType.AUTHENTICATION_ERROR, {
          error: e,
        })
        handleError(error)
      }
    },
    [bridge, handleError]
  )

  useEffect(() => {
    // Ensure it has been connected with a wallet before connecting with SIWE
    if (!shouldConnectWithSiwe) return

    setShouldConnectWithSiwe(false)

    siwe({
      onError: (e) => {
        logger.log('Error connecting with SIWE', e)
        disconnect?.()
        const error = new OpenfortError('Failed to connect with siwe', OpenfortReactErrorType.AUTHENTICATION_ERROR, {
          error: e,
        })
        handleError(error)
      },
      onConnect: () => {
        logger.log('Successfully connected with SIWE')
        setStatus({
          status: 'success',
        })
        updateUser()
        onSuccess({
          hookOptions,
          options: {},
          data: {},
        })
      },
    })
  }, [shouldConnectWithSiwe, siwe, updateUser, disconnect, handleError, hookOptions])

  // const generateSiweMessage = useCallback(
  //   async (args) => {
  //     try {
  //       // setStatus({ status: 'generating-message' });

  //       // Get wallet address from the external wallet
  //       const walletAddress = typeof args.wallet === 'string' ? args.wallet : args.wallet.address;

  //       const result = await client.auth.initSIWE({
  //         address: walletAddress,
  //       });

  //       // Build the SIWE message
  //       const siweMessage = `${args.from.domain} wants you to sign in with your Ethereum account:\n${walletAddress}\n\nSign in to ${args.from.domain}\n\nURI: ${args.from.uri}\nVersion: 1\nChain ID: 1\nNonce: ${result.nonce}\nIssued At: ${new Date().toISOString()}`;

  //       setStatus({
  //         status: 'awaiting-input',
  //         type: 'siwe',
  //       });

  //       return siweMessage;
  //     } catch (error) {
  //       const errorObj = error instanceof Error ? error : new Error('Failed to generate SIWE message');
  //       setStatus({
  //         type: 'siwe',
  //         status: 'error',
  //         error: errorObj
  //       });
  //       throw errorObj;
  //     }
  //   },
  //   [client, setStatus]
  // );

  // const initSiwe = useCallback(
  //   async (opts: {
  //     signature: string;
  //     message?: string;
  //   }): Promise<OpenfortUser> => {
  //     try {
  //       setStatus({
  //         status: 'loading',
  //         type: 'siwe'
  //       });

  //       const message = opts.message || '';

  //       if (!message) {
  //         throw new Error('SIWE message is required. Call generateSiweMessage first.');
  //       }

  //       const result = await client.auth.authenticateWithSIWE({
  //         signature: opts.signature,
  //         message: message,
  //         walletClientType: 'unknown',
  //         connectorType: 'unknown'
  //       });

  //       setStatus({
  //         status: 'success',
  //         type: 'siwe',
  //       });
  //       const user = result.player;

  //       // Refresh user state in provider
  //       await updateUser(user);
  //       // callbacksRef.current?.onSuccess?.(user, false);

  //       return user;
  //     } catch (error) {
  //       const errorObj = error instanceof Error ? error : new Error('Failed to login with SIWE');
  //       setStatus({
  //         status: 'error',
  //         error: errorObj,
  //         type: 'siwe',
  //       });
  //       throw errorObj;
  //     }
  //   },
  //   [client, setStatus, updateUser]
  // );

  const connectWallet = useCallback(
    async (options: ConnectWalletOptions) => {
      setStatus({
        status: 'loading',
      })
      let connector: OpenfortEVMBridgeConnector | null = null

      if (typeof options.connector === 'string') {
        const wallet = availableWallets.find((c) => c.id === options.connector)
        if (wallet) {
          connector = wallet.connector
        }
      } else {
        connector = options.connector
      }

      if (!connector) {
        logger.log('Connector not found', connector)
        return handleError(new OpenfortError('Connector not found', OpenfortReactErrorType.AUTHENTICATION_ERROR))
      }

      setWalletConnectingTo(connector.id)

      if (disconnect) {
        try {
          await disconnect()
        } catch (e) {
          logger.error('Error disconnecting', e)
          const error = new OpenfortError('Failed to disconnect', OpenfortReactErrorType.AUTHENTICATION_ERROR, {
            error: e,
          })
          handleError(error)
          return
        }
      }

      try {
        await connectAsync({
          connector,
        })
        logger.log('Connected to wallet!!!', connector.id)
      } catch (error) {
        logger.error('Error connecting', error)
        handleError(new OpenfortError('Failed to connect', OpenfortReactErrorType.AUTHENTICATION_ERROR, { error }))
      }
    },
    [siwe, disconnect, updateUser, availableWallets, setStatus, hookOptions, connectAsync, handleError]
  )

  return {
    walletConnectingTo,
    connectWallet,
    linkWallet: connectWallet, // siwe() is in charge of linking the wallet if user is authenticated
    availableWallets,
    ...mapStatus(status),
    // generateSiweMessage,
    // initSiwe,
  }
}
