import { ChainTypeEnum, EmbeddedState, RecoveryMethod } from '@openfort/openfort-js'
import { motion } from 'framer-motion'
import type React from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Hex } from 'viem'

import { EmailIcon, FingerPrintIcon, KeyIcon, LockIcon, PhoneIcon, ShieldIcon } from '../../../assets/icons'
import { embeddedWalletId } from '../../../constants/openfort'
import {
  type EthereumUserWallet,
  type RequestWalletRecoverOTPResponse,
  type SolanaUserWallet,
  useWallets,
} from '../../../hooks/openfort/useWallets'
import { useResolvedIdentity } from '../../../hooks/useResolvedIdentity'
import { useOpenfortCore } from '../../../openfort/useOpenfort'
import { useChain } from '../../../shared/hooks/useChain'
import { useSolanaEmbeddedWallet } from '../../../solana/hooks/useSolanaEmbeddedWallet'
import { truncateEthAddress } from '../../../utils'
import { logger } from '../../../utils/logger'
import Button from '../../Common/Button'
import { CopyText } from '../../Common/CopyToClipboard/CopyText'
import FitText from '../../Common/FitText'
import Input from '../../Common/Input'
import Loader from '../../Common/Loading'
import { ModalBody, ModalHeading } from '../../Common/Modal/styles'
import { OtpInputStandalone } from '../../Common/OTPInput'
import { FloatingGraphic } from '../../FloatingGraphic'
import { routes, type SetRouteOptions } from '../../Openfort/types'
import { useOpenfort } from '../../Openfort/useOpenfort'
import { PageContent, type SetOnBackFunction } from '../../PageContent'
import { Body, FooterButtonText, FooterTextButton, ResultContainer } from '../EmailOTP/styles'

type RecoverAutomaticContext = {
  setRoute: (options: SetRouteOptions) => void
  setError: (e: string | false) => void
  setNeedsOTP: (n: boolean) => void
  setOtpResponse: (r: RequestWalletRecoverOTPResponse | null) => void
  isWalletRecoveryOTPEnabled: boolean
  requestWalletRecoverOTP: () => Promise<RequestWalletRecoverOTPResponse>
  setActiveWallet: (opts: {
    walletId: string
    address?: Hex
    recovery?: { recoveryMethod: RecoveryMethod.AUTOMATIC; otpCode: string }
  }) => Promise<{ error?: Error; isOTPRequired?: boolean }>
  solanaSetActive: (opts: { address: string; otpCode?: string }) => Promise<void>
  embeddedWalletId: string
  routes: typeof routes
}

const recoverAutomaticRegistry: {
  [ChainTypeEnum.EVM]: {
    recover: (wallet: EthereumUserWallet, ctx: RecoverAutomaticContext) => Promise<void>
    completeOtp: (wallet: EthereumUserWallet, otp: string, ctx: RecoverAutomaticContext) => Promise<void>
  }
  [ChainTypeEnum.SVM]: {
    recover: (wallet: SolanaUserWallet, ctx: RecoverAutomaticContext) => Promise<void>
    completeOtp: (wallet: SolanaUserWallet, otp: string, ctx: RecoverAutomaticContext) => Promise<void>
  }
} = {
  [ChainTypeEnum.EVM]: {
    recover: async (wallet, ctx) => {
      const response = await ctx.setActiveWallet({
        walletId: ctx.embeddedWalletId,
        address: wallet.address,
      })
      if (response.isOTPRequired && ctx.isWalletRecoveryOTPEnabled) {
        const res = await ctx.requestWalletRecoverOTP()
        ctx.setNeedsOTP(true)
        ctx.setOtpResponse(res)
      } else if (response.error) {
        ctx.setError(response.error.message || 'There was an error recovering your account')
        logger.log('Error recovering wallet', response.error)
      } else {
        ctx.setRoute(ctx.routes.CONNECTED_SUCCESS)
      }
    },
    completeOtp: async (wallet, otp, ctx) => {
      const response = await ctx.setActiveWallet({
        walletId: ctx.embeddedWalletId,
        recovery: { recoveryMethod: RecoveryMethod.AUTOMATIC, otpCode: otp },
        address: wallet.address,
      })
      if (response.error) {
        throw response.error
      }
    },
  },
  [ChainTypeEnum.SVM]: {
    recover: async (wallet, ctx) => {
      if (ctx.isWalletRecoveryOTPEnabled) {
        const res = await ctx.requestWalletRecoverOTP()
        ctx.setNeedsOTP(true)
        ctx.setOtpResponse(res)
      } else {
        await ctx.solanaSetActive({ address: wallet.address })
        ctx.setRoute(ctx.routes.SOL_CONNECTED)
      }
    },
    completeOtp: async (wallet, otp, ctx) => {
      await ctx.solanaSetActive({ address: wallet.address, otpCode: otp })
    },
  },
}

const RecoverPasswordWallet = ({
  wallet,
  onBack,
  logoutOnBack,
}: {
  wallet: EthereumUserWallet | SolanaUserWallet
  onBack: SetOnBackFunction
  logoutOnBack?: boolean
}) => {
  const [recoveryPhrase, setRecoveryPhrase] = useState('')
  const [recoveryError, setRecoveryError] = useState<false | string>(false)
  const { triggerResize, setRoute } = useOpenfort()
  const [loading, setLoading] = useState(false)
  const { setActiveWallet } = useWallets()

  const { chainType } = useChain()
  const solanaEmbeddedWallet = useSolanaEmbeddedWallet()

  const handleSubmit = async () => {
    setLoading(true)

    const { error } = await setActiveWallet({
      walletId: embeddedWalletId,
      recovery: {
        recoveryMethod: RecoveryMethod.PASSWORD,
        password: recoveryPhrase,
      },
      address: wallet.address as `0x${string}`,
    })
    setLoading(false)

    if (error) {
      setRecoveryError(error.message || 'There was an error recovering your account')
    } else {
      if (chainType === ChainTypeEnum.SVM) {
        await solanaEmbeddedWallet.setActive({ address: wallet.address })
        setRoute(routes.SOL_CONNECTED)
      } else {
        setRoute(routes.CONNECTED_SUCCESS)
      }
    }
  }

  useEffect(() => {
    if (recoveryError) triggerResize()
  }, [recoveryError])

  const identity = useResolvedIdentity({
    address: wallet.address,
    chainType,
    enabled: !!wallet.address,
  })
  const ensName = identity.status === 'success' ? identity.name : undefined

  return (
    <PageContent onBack={onBack} logoutOnBack={logoutOnBack}>
      <FloatingGraphic
        height="130px"
        logoCenter={{
          logo: <KeyIcon />,
          size: '1.2',
        }}
        logoTopLeft={{
          logo: <ShieldIcon />,
          size: '0.75',
        }}
        logoBottomRight={{
          logo: <LockIcon />,
          size: '0.5',
        }}
      />
      <ModalHeading>Recover wallet</ModalHeading>
      <ModalBody style={{ textAlign: 'center' }}>
        Please enter the recovery password to recover wallet{' '}
        <CopyText value={wallet.address}>{ensName ?? truncateEthAddress(wallet.address)}</CopyText>
      </ModalBody>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          handleSubmit()
        }}
      >
        <Input
          value={recoveryPhrase}
          onChange={(e) => setRecoveryPhrase(e.target.value)}
          type="password"
          placeholder="Enter your password"
          autoComplete="off"
        />

        {recoveryError && (
          <motion.div key={recoveryError} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <ModalBody style={{ height: 24, marginTop: 12 }} $error>
              <FitText>{recoveryError}</FitText>
            </ModalBody>
          </motion.div>
        )}
        <Button onClick={handleSubmit} waiting={loading} disabled={loading}>
          Recover wallet
        </Button>
      </form>
    </PageContent>
  )
}

const RecoverPasskeyWallet = ({
  wallet,
  onBack,
  logoutOnBack,
}: {
  wallet: EthereumUserWallet | SolanaUserWallet
  onBack: SetOnBackFunction
  logoutOnBack?: boolean
}) => {
  const { triggerResize } = useOpenfort()
  const { setActiveWallet, error: recoveryError } = useWallets()
  const [shouldRecoverWallet, setShouldRecoverWallet] = useState(false)
  const { setRoute } = useOpenfort()

  const { chainType } = useChain()
  const solanaEmbeddedWallet = useSolanaEmbeddedWallet()

  const recoverWallet = async () => {
    const { error } = await setActiveWallet({
      walletId: embeddedWalletId,
      recovery: {
        recoveryMethod: RecoveryMethod.PASSKEY,
      },
      address: wallet.address as `0x${string}`,
    })

    if (!error) {
      if (chainType === ChainTypeEnum.SVM) {
        await solanaEmbeddedWallet.setActive({ address: wallet.address })
        setRoute(routes.SOL_CONNECTED)
      } else {
        setRoute(routes.CONNECTED_SUCCESS)
      }
    }
  }

  useEffect(() => {
    // To ensure the wallet is created only once
    if (shouldRecoverWallet) {
      recoverWallet()
    }
  }, [shouldRecoverWallet])

  useEffect(() => {
    setShouldRecoverWallet(true)
  }, [])

  useEffect(() => {
    if (recoveryError) triggerResize()
  }, [recoveryError])

  const identity = useResolvedIdentity({
    address: wallet.address,
    chainType,
    enabled: !!wallet.address,
  })
  const ensName = identity.status === 'success' ? identity.name : undefined
  const walletDisplay = ensName ?? truncateEthAddress(wallet.address)

  return (
    <PageContent onBack={onBack} logoutOnBack={logoutOnBack}>
      <Loader
        icon={<FingerPrintIcon />}
        isError={!!recoveryError}
        header={recoveryError ? 'Invalid passkey.' : `Recovering wallet ${walletDisplay} with passkey...`}
        description={recoveryError ? 'There was an error creating your passkey. Please try again.' : undefined}
        onRetry={() => recoverWallet()}
      />
    </PageContent>
  )
}

const RecoverAutomaticWallet = ({
  wallet,
  onBack,
  logoutOnBack,
}: {
  wallet: EthereumUserWallet | SolanaUserWallet
  onBack: SetOnBackFunction
  logoutOnBack?: boolean
}) => {
  const { embeddedState } = useOpenfortCore()
  const { setActiveWallet, isWalletRecoveryOTPEnabled, requestWalletRecoverOTP } = useWallets()
  const { setRoute } = useOpenfort()
  const { chainType } = useChain()
  const solanaEmbeddedWallet = useSolanaEmbeddedWallet()
  const [error, setError] = useState<false | string>(false)
  const [needsOTP, setNeedsOTP] = useState(false)
  const [otpResponse, setOtpResponse] = useState<RequestWalletRecoverOTPResponse | null>(null)
  const [otpStatus, setOtpStatus] = useState<'idle' | 'loading' | 'error' | 'success' | 'sending-otp' | 'send-otp'>(
    'idle'
  )

  const recoveryCtx: RecoverAutomaticContext = useMemo(
    () => ({
      setRoute,
      setError,
      setNeedsOTP,
      setOtpResponse,
      isWalletRecoveryOTPEnabled,
      requestWalletRecoverOTP,
      setActiveWallet,
      solanaSetActive: solanaEmbeddedWallet.setActive.bind(solanaEmbeddedWallet),
      embeddedWalletId,
      routes,
    }),
    [setRoute, isWalletRecoveryOTPEnabled, requestWalletRecoverOTP, setActiveWallet, solanaEmbeddedWallet]
  )

  const recoverWallet = useCallback(async () => {
    if (embeddedState !== EmbeddedState.EMBEDDED_SIGNER_NOT_CONFIGURED) return
    logger.log('Automatically recovering wallet', wallet.address)
    if (chainType === ChainTypeEnum.SVM) {
      await recoverAutomaticRegistry[ChainTypeEnum.SVM].recover(wallet as SolanaUserWallet, recoveryCtx)
    } else {
      await recoverAutomaticRegistry[ChainTypeEnum.EVM].recover(wallet as EthereumUserWallet, recoveryCtx)
    }
  }, [wallet, embeddedState, chainType, recoveryCtx])

  const shouldRecoverWallet = useRef(false)
  useEffect(() => {
    if (shouldRecoverWallet.current) return
    shouldRecoverWallet.current = true
    recoverWallet()
  }, [])

  const handleCompleteOtp = async (otp: string) => {
    setOtpStatus('loading')
    try {
      if (chainType === ChainTypeEnum.SVM) {
        await recoverAutomaticRegistry[ChainTypeEnum.SVM].completeOtp(wallet as SolanaUserWallet, otp, recoveryCtx)
      } else {
        await recoverAutomaticRegistry[ChainTypeEnum.EVM].completeOtp(wallet as EthereumUserWallet, otp, recoveryCtx)
      }
      setOtpStatus('success')
      setTimeout(
        () => setRoute(chainType === ChainTypeEnum.SVM ? routes.SOL_CONNECTED : routes.CONNECTED_SUCCESS),
        1000
      )
    } catch (err) {
      setOtpStatus('error')
      setError(err instanceof Error ? err.message : 'There was an error verifying the OTP')
      logger.log('Error verifying OTP for wallet recovery', err)
      setTimeout(() => {
        setOtpStatus('idle')
        setError(false)
      }, 1000)
    }
  }

  const identity = useResolvedIdentity({
    address: wallet.address,
    chainType,
    enabled: !!wallet.address,
  })
  const ensName = identity.status === 'success' ? identity.name : undefined
  const walletDisplay = ensName ?? truncateEthAddress(wallet.address)
  const [canSendOtp, setCanSendOtp] = useState(true)

  // Handle resend cooldown
  useEffect(() => {
    if (canSendOtp) return

    const timerId = setTimeout(() => {
      setCanSendOtp(true)
    }, 10000)

    return () => clearTimeout(timerId)
  }, [canSendOtp])

  const handleResendClick = useCallback(() => {
    setOtpStatus('send-otp')
    setCanSendOtp(false)
  }, [])

  const isResendDisabled = !canSendOtp || otpStatus === 'sending-otp' || otpStatus === 'send-otp'
  // Memoize button text to avoid recalculation
  const sendButtonText = useMemo(() => {
    if (!canSendOtp) return 'Code Sent!'
    if (otpStatus === 'sending-otp') return 'Sending...'
    return 'Resend Code'
  }, [canSendOtp, otpStatus])

  if (needsOTP && isWalletRecoveryOTPEnabled) {
    return (
      <PageContent onBack={onBack} logoutOnBack={logoutOnBack}>
        <ModalHeading>Enter your code</ModalHeading>

        <FloatingGraphic
          height="100px"
          marginTop="8px"
          marginBottom="10px"
          logoCenter={{
            logo: otpResponse?.sentTo === 'phone' ? <PhoneIcon /> : <EmailIcon />,
          }}
        />
        <ModalBody>
          <Body>
            Recovering wallet <CopyText value={wallet.address}>{walletDisplay}</CopyText>
            Please check <b>{otpResponse?.sentTo === 'phone' ? otpResponse?.phone : otpResponse?.email}</b> and enter
            your code below.
          </Body>
          <OtpInputStandalone
            length={9}
            scale="80%"
            onComplete={handleCompleteOtp}
            isLoading={otpStatus === 'loading'}
            isError={otpStatus === 'error'}
            isSuccess={otpStatus === 'success'}
          />
          <ResultContainer>
            {otpStatus === 'success' && <ModalBody $valid>Code verified successfully!</ModalBody>}
            {otpStatus === 'error' && <ModalBody $error>{error || 'Invalid code. Please try again.'}</ModalBody>}
          </ResultContainer>
          <FooterTextButton>
            Didn't receive the code?{' '}
            <FooterButtonText type="button" onClick={handleResendClick} disabled={isResendDisabled}>
              {sendButtonText}
            </FooterButtonText>
          </FooterTextButton>
        </ModalBody>
      </PageContent>
    )
  }

  if (error) {
    return (
      <PageContent onBack={onBack} logoutOnBack={logoutOnBack}>
        <ModalBody style={{ textAlign: 'center' }} $error>
          <FitText>{error}</FitText>
        </ModalBody>
      </PageContent>
    )
  }

  return (
    <PageContent>
      <Loader header={`Recovering wallet...`} />
    </PageContent>
  )
}

const RecoverWallet = ({
  wallet,
  onBack,
  logoutOnBack,
}: {
  wallet: EthereumUserWallet | SolanaUserWallet
  onBack: SetOnBackFunction
  logoutOnBack?: boolean
}) => {
  switch (wallet.recoveryMethod) {
    case RecoveryMethod.PASSWORD:
      return <RecoverPasswordWallet wallet={wallet} onBack={onBack} logoutOnBack={logoutOnBack} />
    case RecoveryMethod.AUTOMATIC:
      return <RecoverAutomaticWallet wallet={wallet} onBack={onBack} logoutOnBack={logoutOnBack} />
    case RecoveryMethod.PASSKEY:
      return <RecoverPasskeyWallet wallet={wallet} onBack={onBack} logoutOnBack={logoutOnBack} />
    default:
      logger.error(`Unsupported recovery method: ${wallet.recoveryMethod}, defaulting to automatic.`)
      return <RecoverAutomaticWallet wallet={wallet} onBack={onBack} logoutOnBack={logoutOnBack} />
  }
}

const RecoverPage: React.FC = () => {
  const { previousRoute, route } = useOpenfort()
  const wallet =
    route.route === routes.SOL_RECOVER_WALLET
      ? (route as { route: typeof routes.SOL_RECOVER_WALLET; wallet: SolanaUserWallet }).wallet
      : route.route === routes.RECOVER_WALLET
        ? (route as { route: typeof routes.RECOVER_WALLET; wallet: EthereumUserWallet }).wallet
        : undefined

  const { onBack, logoutOnBack } = useMemo<{
    onBack: SetOnBackFunction
    logoutOnBack?: boolean
  }>(() => {
    if (previousRoute?.route === routes.SELECT_WALLET_TO_RECOVER) {
      return {
        onBack: 'back',
        logoutOnBack: false,
      }
    }

    return { onBack: routes.PROVIDERS, logoutOnBack: true }
  }, [previousRoute])

  if (!wallet) return null
  return <RecoverWallet wallet={wallet} onBack={onBack} logoutOnBack={logoutOnBack} />
}

export default RecoverPage
