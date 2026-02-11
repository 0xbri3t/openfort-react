import { RecoveryMethod } from '@openfort/openfort-js'
import { FingerPrintIcon, KeyIcon, LockIcon } from '../../../assets/icons'

export const WalletRecoveryIcon = ({ recovery }: { recovery: RecoveryMethod | undefined }) => {
  switch (recovery) {
    case RecoveryMethod.PASSWORD:
      return <KeyIcon />
    case RecoveryMethod.PASSKEY:
      return <FingerPrintIcon />
    case RecoveryMethod.AUTOMATIC:
      return <LockIcon />
    default:
      return null
  }
}
