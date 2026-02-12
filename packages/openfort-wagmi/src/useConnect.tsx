import {
  type Connector,
  type CreateConnectorFn,
  type UseConnectParameters,
  type UseConnectReturnType,
  useConnect as wagmiUseConnect,
} from 'wagmi'

type CustomConnectParams = {
  connector: CreateConnectorFn | Connector
  chainId?: number
  mutation?: UseConnectParameters['mutation']
}

type CustomUseConnectReturnType = Omit<UseConnectReturnType, 'connect' | 'connectAsync'> & {
  connect: (params: CustomConnectParams) => void
  connectAsync: (params: CustomConnectParams) => Promise<unknown>
}

export function useConnect(props: UseConnectParameters = {}): CustomUseConnectReturnType {
  const { connect, connectAsync, connectors, ...rest } = wagmiUseConnect({
    ...props,
    mutation: {
      ...props.mutation,
      onError(...err) {
        props.mutation?.onError?.(...err)
      },
    },
  })

  return {
    connect: ({ connector, chainId, mutation }: CustomConnectParams) => {
      return connect({ connector, chainId }, mutation)
    },
    connectAsync: async ({ connector, chainId, mutation }: CustomConnectParams) => {
      return connectAsync({ connector, chainId }, mutation)
    },
    connectors,
    ...rest,
  }
}
