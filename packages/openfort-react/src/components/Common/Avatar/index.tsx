import type React from 'react'
import { useEffect, useRef, useState } from 'react'
import { useConnectionStrategy } from '../../../core/ConnectionStrategyContext'
import { useEVMBridge } from '../../../core/OpenfortEVMBridgeContext'
import useIsMounted from '../../../hooks/useIsMounted'
import { ResetContainer } from '../../../styles'
import { useOpenfort } from '../../Openfort/useOpenfort'
import { EnsAvatar, ImageContainer } from './styles'

type Hash = `0x${string}`

export type CustomAvatarProps = {
  address?: Hash | undefined
  ensName?: string | undefined
  ensImage?: string
  size: number
  radius: number
}

const Avatar: React.FC<{
  address?: Hash | undefined
  name?: string | undefined
  size?: number
  radius?: number
}> = ({ address, name, size = 96, radius = 96 }) => {
  const isMounted = useIsMounted()
  const context = useOpenfort()
  const strategy = useConnectionStrategy()
  const bridge = useEVMBridge()
  const useEns = strategy?.kind === 'bridge' && !!bridge

  const imageRef = useRef<any>(null)
  const [loaded, setLoaded] = useState(true)
  const [ens, setEns] = useState<{ address?: Hash; name?: string; avatar?: string }>({})

  useEffect(() => {
    if (!useEns) {
      setEns({ address, name })
      return
    }
    const resolve = async () => {
      let resolvedAddress: Hash | undefined = address
      let resolvedName: string | undefined = name
      if (name && bridge.getEnsAddress) {
        resolvedAddress = (await bridge.getEnsAddress(name)) ?? address
      }
      if (address && bridge.getEnsName) {
        resolvedName = (await bridge.getEnsName({ address })) ?? name
      }
      if (bridge.account?.address === address && bridge.account?.ensName) {
        resolvedName = bridge.account.ensName
      }
      if (bridge.account?.address === address && bridge.account?.ensAvatar) {
        setEns({
          address: resolvedAddress ?? address,
          name: resolvedName ?? name,
          avatar: bridge.account.ensAvatar,
        })
        return
      }
      let avatar: string | undefined
      if (resolvedName && bridge.getEnsAvatar) {
        avatar = await bridge.getEnsAvatar(resolvedName)
      }
      setEns({
        address: resolvedAddress ?? address,
        name: resolvedName ?? name,
        avatar,
      })
    }
    resolve()
  }, [useEns, bridge, address, name])

  useEffect(() => {
    if (!(imageRef.current?.complete && imageRef.current.naturalHeight !== 0)) {
      setLoaded(false)
    }
  }, [ens.avatar])

  if (!isMounted) return <div style={{ width: size, height: size, borderRadius: radius }} />

  if (context.uiConfig.customAvatar)
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: radius,
          overflow: 'hidden',
        }}
      >
        {context.uiConfig.customAvatar({
          address: address ?? ens?.address,
          ensName: name ?? ens?.name,
          ensImage: ens?.avatar,
          size,
          radius,
        })}
      </div>
    )

  if (!ens.name || !ens.avatar)
    return (
      <ResetContainer style={{ pointerEvents: 'none' }}>
        <EnsAvatar $size={size} $seed={ens.address} $radius={radius} />
      </ResetContainer>
    )
  return (
    <ResetContainer style={{ pointerEvents: 'none' }}>
      <EnsAvatar $size={size} $seed={ens.address} $radius={radius}>
        <ImageContainer
          ref={imageRef}
          src={ens.avatar}
          alt={ens.name}
          onLoad={() => setLoaded(true)}
          $loaded={loaded}
        />
      </EnsAvatar>
    </ResetContainer>
  )
}

export default Avatar
