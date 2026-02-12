import { expect, type Page } from '@playwright/test'
import type { PlaygroundMode } from '../utils/mode'
import { EVM_SIGNED_REGEX, SOLANA_SIGNED_REGEX } from '../utils/mode'

export class DashboardPage {
  constructor(private readonly page: Page) {}

  // Navigate to the dashboard
  async goto() {
    await this.page.goto('/showcase/auth', { waitUntil: 'domcontentloaded' })
  }

  // Sign out button
  signOutButton() {
    return this.page.getByRole('button', { name: /^sign out$/i })
  }

  /**
   * Verify that the dashboard is loaded.
   * @param mode - Optional; used for stricter connectivity checks.
   */
  async expectLoaded(mode: PlaygroundMode) {
    await expect(this.signOutButton()).toBeVisible({ timeout: 90_000 })
    const connectedRegex = mode === 'solana-only' ? /Connected with/i : /Connected with 0x/i
    await expect(this.page.getByText(connectedRegex)).toBeVisible({ timeout: 15_000 })
    await new Promise((r) => setTimeout(r, 1000))
  }

  /**
   * Ensure navigation and ready state.
   * For evm-wagmi: skip goto() since wagmi state is in-memory — a reload would lose the connection.
   * The evmWagmiLogin fixture already navigated to the dashboard.
   */
  async ensureReady(mode: PlaygroundMode) {
    if (!mode) {
      throw new Error('Mode is required')
    }
    if (mode !== 'evm-wagmi') {
      await this.goto()
    }
    await this.expectLoaded(mode)
  }

  /**
   * Sign a message and validate the result.
   * @param message - Message to sign
   * @param mode - EVM uses 0x signed hash; Solana uses base58.
   */
  async signMessage(message: string, mode: PlaygroundMode) {
    await this.ensureReady(mode)

    const messageInput = this.page.getByPlaceholder(/enter a message to sign/i)
    await expect(messageInput).toBeVisible({ timeout: 60_000 })
    await messageInput.fill(message)

    const signBtn = this.page.getByRole('button', { name: /sign a message/i })
    await expect(signBtn).toBeVisible({ timeout: 60_000 })

    await signBtn.click()

    const signedRegex = mode === 'solana-only' ? SOLANA_SIGNED_REGEX : EVM_SIGNED_REGEX

    try {
      await expect(this.page.getByText(signedRegex)).toBeVisible({ timeout: 120_000 })
    } catch (e) {
      await this.page.screenshot({ path: 'test-results/sign-message-failed.png', fullPage: true }).catch(() => {})
      throw e
    }
  }

  async getCardByTitle(title: string | RegExp) {
    const titleLocator = this.page.locator('[data-slot="card"]').filter({ hasText: title }).first()

    await expect(titleLocator).toBeVisible({ timeout: 10_000 })

    return titleLocator
  }
}
