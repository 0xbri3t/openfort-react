import { expect, test } from '../fixtures/test'

test.describe('Wallets - creation edge cases', () => {
  test('shows creating state during wallet creation and clears on success', async ({ page, dashboardPage }) => {
    test.setTimeout(180_000)
    await dashboardPage.ensureReady()

    const walletsTitle = page
      .locator('[data-slot="card-title"]')
      .filter({ hasText: /^wallets$/i })
      .first()
    await expect(walletsTitle).toBeVisible({ timeout: 60_000 })

    const walletsCard = walletsTitle.locator('xpath=ancestor::*[@data-slot="card"][1]')
    const walletRowLocator = walletsCard.locator('button').filter({
      hasText: /0x[a-f0-9]{4,}\.\.\.[a-f0-9]{4,}/i,
    })

    const initialCount = await walletRowLocator.count()

    // Start creating wallet
    await walletsCard.getByRole('button', { name: /create new wallet/i }).click()
    await walletsCard.getByRole('button', { name: /smart account/i }).click()
    await walletsCard.getByRole('button', { name: /^automatic$/i }).click()

    // Creating state should be visible
    const creatingText = walletsCard.getByText(/creating wallet/i)
    await expect(creatingText).toBeVisible({ timeout: 30_000 })

    // Wait for wallet to appear (success)
    await expect.poll(async () => await walletRowLocator.count(), { timeout: 120_000 }).toBeGreaterThan(initialCount)

    // Creating text should disappear after success
    await expect(creatingText).not.toBeVisible({ timeout: 30_000 })
  })

  test('creates two wallets sequentially with correct account type badges', async ({ page, dashboardPage }) => {
    test.setTimeout(300_000)
    await dashboardPage.ensureReady()

    const walletsTitle = page
      .locator('[data-slot="card-title"]')
      .filter({ hasText: /^wallets$/i })
      .first()
    await expect(walletsTitle).toBeVisible({ timeout: 60_000 })

    const walletsCard = walletsTitle.locator('xpath=ancestor::*[@data-slot="card"][1]')
    const walletRowLocator = walletsCard.locator('button').filter({
      hasText: /0x[a-f0-9]{4,}\.\.\.[a-f0-9]{4,}/i,
    })

    const initialCount = await walletRowLocator.count()

    // Create first wallet: EOA + Automatic
    await walletsCard.getByRole('button', { name: /create new wallet/i }).click()
    await walletsCard.getByRole('button', { name: /^eoa$/i }).click()
    await walletsCard.getByRole('button', { name: /^automatic$/i }).click()

    await expect.poll(async () => await walletRowLocator.count(), { timeout: 120_000 }).toBeGreaterThan(initialCount)

    const afterFirstCount = await walletRowLocator.count()

    // Create second wallet: Smart Account + Automatic
    await walletsCard.getByRole('button', { name: /create new wallet/i }).click()
    await walletsCard.getByRole('button', { name: /smart account/i }).click()
    await walletsCard.getByRole('button', { name: /^automatic$/i }).click()

    await expect.poll(async () => await walletRowLocator.count(), { timeout: 120_000 }).toBeGreaterThan(afterFirstCount)

    // Verify both account type badges are present
    const eoaBadge = walletsCard.locator('span').filter({ hasText: /^EOA$/ })
    const smBadge = walletsCard.locator('span').filter({ hasText: /^SM$/ })

    await expect(eoaBadge.first()).toBeVisible({ timeout: 10_000 })
    await expect(smBadge.first()).toBeVisible({ timeout: 10_000 })
  })
})
