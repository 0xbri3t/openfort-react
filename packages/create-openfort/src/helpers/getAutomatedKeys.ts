import * as p from "@clack/prompts";
import { randomUUID } from "crypto";

export interface AutomatedKeys {
  openfortPublishableKey: string;
  openfortSecretKey: string;
  shieldPublishableKey: string;
  shieldSecretKey: string;
  shieldEncryptionShare: string;
}

export const getAutomatedKeys = async (): Promise<AutomatedKeys> => {
  const projectName = await p.text({
    message: "What is the name of your project?",
    placeholder: "My Awesome Project",
    validate: (value) => {
      if (!value) return "Please enter a project name.";
    },
  });

  if (p.isCancel(projectName)) {
    p.cancel("Operation cancelled.");
    process.exit(0);
  }

  const sessionId = randomUUID();

  const url = new URL("https://dashboard.openfort.xyz/cli/callback");
  url.searchParams.set("session_id", sessionId);
  url.searchParams.set("name", projectName as string);

  p.log.info(`Please visit: ${url.toString()}`);
  const s = p.spinner();
  s.start("Waiting for authentication...");

  const pollForKeys = async (): Promise<AutomatedKeys> => {
    const pollInterval = 2000; // 2 seconds
    const timeout = 5 * 60 * 1000; // 5 minutes
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      try {
        const response = await fetch(
          `https://api.openfort.xyz/v1/cli/session/${sessionId}`,
        );

        if (response.ok) {
          return await response.json();
        }

        if (response.status !== 404) {
          const errorText = await response.text();
          throw new Error(`API error: ${response.status} - ${errorText}`);
        }
      } catch (e) {
        if (e instanceof Error && e.message.includes("API error")) {
          throw e; // Immediately fail on API errors other than 404
        }
        // Ignore fetch errors (e.g. network issues) and 404s, and just keep polling
      }

      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }

    throw new Error("Timed out waiting for authentication.");
  };

  try {
    const autoKeys = await pollForKeys();
    s.stop("Authentication successful! Keys retrieved.");
    return autoKeys;
  } catch (error) {
    s.stop("Authentication failed.");
    if (error instanceof Error) {
      p.log.error(error.message);
    }
    throw error;
  }
};
