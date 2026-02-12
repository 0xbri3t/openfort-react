import { expect, type Locator, type Page } from '@playwright/test'
import type { PlaygroundMode } from '../utils/mode'
import { safeClick } from '../utils/ui'

export class AuthPage {
  constructor(private readonly page: Page) {}

  // Navigate to the auth screen
  async goto() {
    await this.page.goto('/showcase/auth', { waitUntil: 'domcontentloaded' })
    await expect(this.page).toHaveURL(/\/showcase\/auth/i)
  }

  // Locate the connection modal if it exists
  private connectModal(): Locator {
    return this.page
      .locator('[role="dialog"]')
      .filter({ hasText: /^connect$/i })
      .first()
  }

  // Open the "Connect" modal from the navbar
  async openConnectModalFromNavbar() {
    await safeClick(this.page, /^(not connected|connect wallet)$/i, 30_000)

    await expect(this.page.getByText(/^connect$/i)).toBeVisible({ timeout: 30_000 })
    await expect(this.page.getByPlaceholder('Enter your email')).toBeVisible({ timeout: 30_000 })
  }

  /**
   * Continue as guest and wait for the flow to advance.
   * @param mode - EVM modes expect 0x address; Solana expects base58.
   */
  async continueAsGuest(mode: PlaygroundMode) {
    const modal = this.connectModal()
    const hasModal = (await modal.count().catch(() => 0)) > 0
    const root: Page | Locator = hasModal ? modal : this.page

    const guestBtn = root.getByRole('button', { name: /^guest$/i })

    if (await guestBtn.isVisible().catch(() => false)) {
      await expect(guestBtn).toBeEnabled({ timeout: 30_000 })
      await guestBtn.click({ timeout: 30_000 })
    }

    const connectedRegex = mode === 'solana-only' ? /Connected with/i : /Connected with 0x/i
    await expect(this.page.getByText(connectedRegex)).toBeVisible({ timeout: 60_000 })
  }
}
