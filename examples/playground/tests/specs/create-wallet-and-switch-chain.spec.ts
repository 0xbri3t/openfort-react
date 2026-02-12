import { expect, test } from '../fixtures/test'
import { EVM_ADDRESS_REGEX } from '../utils/mode'

test.describe('Dashboard integration - wallets + chain', () => {
  test('create wallet (password) -> switch chain -> wallets list still present', async ({
    page,
    dashboardPage,
    mode,
  }) => {
    test.setTimeout(180_000)
    const m = mode
    await dashboardPage.ensureReady(m)

    // Wallets card
    const walletsTitle = page
      .locator('[data-slot="card-title"]')
      .filter({ hasText: /^wallets$/i })
      .first()
    await expect(walletsTitle).toBeVisible({ timeout: 60_000 })

    const walletsCard = walletsTitle.locator('xpath=ancestor::*[@data-slot="card"][1]')
    await expect(walletsCard).toBeVisible({ timeout: 60_000 })

    const walletRowLocator = walletsCard.locator('button').filter({
      hasText: EVM_ADDRESS_REGEX,
    })

    const initialCount = await walletRowLocator.count()

    // Create new wallet -> Password
    await walletsCard.getByRole('button', { name: /create new wallet/i }).click()
    await walletsCard.getByRole('button', { name: /^password$/i }).click()

    await expect(walletsCard.getByText(/^creating wallet with password recovery/i)).toBeVisible({ timeout: 30_000 })
    await expect.poll(async () => await walletRowLocator.count(), { timeout: 120_000 }).toBeGreaterThan(initialCount)

    // Switch chain
    const chainCard = await dashboardPage.getCardByTitle(/switch chain/i)

    const target = 'Base Sepolia'
    const btn = chainCard.getByRole('button', { name: new RegExp(`^switch to\\s+${escapeRegExp(target)}$`, 'i') })
    if (!(await btn.isDisabled().catch(() => false))) {
      await btn.click()
    }
    await expect(chainCard.getByText(new RegExp(`^switched to chain\\s+${escapeRegExp(target)}$`, 'i'))).toBeVisible({
      timeout: 90_000,
    })

    // Wallet list still present and at least 1 wallet exists
    await expect(walletRowLocator.first()).toBeVisible({ timeout: 60_000 })
    const afterSwitchCount = await walletRowLocator.count()
    expect(afterSwitchCount).toBeGreaterThanOrEqual(1)
  })
})

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
