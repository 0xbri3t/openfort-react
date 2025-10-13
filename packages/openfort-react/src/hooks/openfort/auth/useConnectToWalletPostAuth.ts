import { AccountTypeEnum, EmbeddedAccount, RecoveryMethod } from "@openfort/openfort-js"
import { useQueryClient } from "@tanstack/react-query"
import { useCallback } from "react"
import { Hex } from "viem"
import { useOpenfort } from "../../../components/Openfort/useOpenfort"
import { embeddedWalletId } from "../../../constants/openfort"
import { UserWallet, useWallets } from "../useWallets"
import { useSignOut } from "./useSignOut"

/**
 * Options that control the behaviour of {@link useConnectToWalletPostAuth} when attempting to
 * recover or create an embedded wallet after authentication.
 */
export type CreateWalletPostAuthOptions = {
  /**
   * Whether the user should be signed out if automatic wallet creation fails.
   *
   * @defaultValue true
   */
  logoutOnError?: boolean;

  /**
   * Whether the hook should automatically attempt to recover an existing wallet that
   * supports automatic recovery.
   *
   * @defaultValue true
   */
  recoverWalletAutomatically?: boolean;
};

/**
 * React hook that attempts to recover or create an embedded wallet once a user has authenticated.
 *
 * @returns Helpers that execute the post-authentication wallet connection flow.
 *
 * @example
 * ```ts
 * const { tryUseWallet } = useConnectToWalletPostAuth();
 *
 * const result = await tryUseWallet({ recoverWalletAutomatically: false });
 * if (!result.wallet) {
 *   console.warn('No embedded wallet available after authentication');
 * }
 * ```
 */
export const useConnectToWalletPostAuth = () => {
  const { createWallet, setActiveWallet } = useWallets()
  const { walletConfig } = useOpenfort();
  const { signOut } = useSignOut();
  const queryClient = useQueryClient();

  const tryUseWallet = useCallback(async ({ logoutOnError: signOutOnError = true, recoverWalletAutomatically }: CreateWalletPostAuthOptions): Promise<{ wallet?: UserWallet }> => {
    if (walletConfig?.recoverWalletAutomaticallyAfterAuth === false && recoverWalletAutomatically === undefined) { return {}; }

    if (recoverWalletAutomatically === undefined) { recoverWalletAutomatically = true; }
    if ((!walletConfig?.createEncryptedSessionEndpoint && !walletConfig?.getEncryptionSession) || !recoverWalletAutomatically) {
      // If there is no encryption session, we cannot create a wallet
      return {};
    }

    let wallets = await queryClient.ensureQueryData<EmbeddedAccount[]>({ queryKey: ['openfortEmbeddedAccountsList'] });

    let wallet: UserWallet | undefined;

    if (wallets.length === 0) {
      const createWalletResult = await createWallet();
      if (createWalletResult.error && signOutOnError) {
        console.error("Error creating wallet:", createWalletResult.error);
        // If there was an error and we should log out, we can call the logout function
        await signOut();
        return {};
      }
      wallet = createWalletResult.wallet!;
      wallets = await queryClient.ensureQueryData<EmbeddedAccount[]>({ queryKey: ['openfortEmbeddedAccountsList'] });
    }

    // Has a wallet with automatic recovery
    const hasAutoRecovery = wallets.some(w => w.recoveryMethod === RecoveryMethod.AUTOMATIC || w.recoveryMethod === RecoveryMethod.PASSKEY);
    const shouldForceActivation = walletConfig?.accountType === AccountTypeEnum.EOA && wallets.length > 0;

    if (hasAutoRecovery || shouldForceActivation) {
      const targetAddress =
        wallet?.address ??
        wallets.find(w => w.recoveryMethod === RecoveryMethod.AUTOMATIC || w.recoveryMethod === RecoveryMethod.PASSKEY)?.address as Hex | undefined ??
        wallets[0]?.address as Hex | undefined;

      const setWalletResult = await setActiveWallet({
        walletId: embeddedWalletId,
        address: targetAddress,
      });

      if (!setWalletResult.wallet || (setWalletResult.error && signOutOnError)) {
        console.error("Error recovering wallet:", setWalletResult.error);
        // If there was an error and we should log out, we can call the logout function
        await signOut();
      }
      wallet = setWalletResult.wallet ?? wallet;
    }

    return { wallet };
  }, [walletConfig, setActiveWallet, signOut, createWallet, queryClient]);

  return {
    tryUseWallet,
  }
}
