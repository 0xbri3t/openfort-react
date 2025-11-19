import * as p from "@clack/prompts";

export interface AutomatedKeys {
  openfortPublishableKey: string;
  openfortSecretKey: string;
  shieldPublishableKey: string;
  shieldSecretKey: string;
  shieldEncryptionShare: string;
}

export const getAutomatedKeys = async (): Promise<AutomatedKeys> => {
  p.log.info(
    "Please visit: https://dashboard.openfort.xyz/cli/callback?id=mocked_id",
  );
  const s = p.spinner();
  s.start("Waiting for authentication...");

  // Mock delay and response
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Mocked keys
  const autoKeys = {
    openfortPublishableKey: "pk_test_mocked_one_click_setup",
    openfortSecretKey: "sk_test_mocked_one_click_setup",
    shieldPublishableKey: "mocked_shield_pub_one_click_setup",
    shieldSecretKey: "mocked_shield_secret_one_click_setup",
    shieldEncryptionShare: "mocked_share_one_click_setup",
  };

  s.stop("Authentication successful! Keys retrieved.");
  return autoKeys;
};
