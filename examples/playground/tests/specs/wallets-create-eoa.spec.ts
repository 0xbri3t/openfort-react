import { expect, test } from '../fixtures/test'

test.describe('Wallets - create EOA wallet', () => {
  test('creates EOA wallet with Automatic recovery', async ({ page, dashboardPage }) => {
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

    await walletsCard.getByRole('button', { name: /create new wallet/i }).click()
    await walletsCard.getByRole('button', { name: /^eoa$/i }).click()
    await walletsCard.getByRole('button', { name: /^automatic$/i }).click()

    const creatingText = walletsCard.getByText(/creating wallet with automatic recovery/i)
    await expect(creatingText).toBeVisible({ timeout: 30_000 })

    await expect.poll(async () => await walletRowLocator.count(), { timeout: 120_000 }).toBeGreaterThan(initialCount)
  })

  test('creates EOA wallet with Password recovery', async ({ page, dashboardPage }) => {
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

    await walletsCard.getByRole('button', { name: /create new wallet/i }).click()
    await walletsCard.getByRole('button', { name: /^eoa$/i }).click()
    await walletsCard.getByRole('button', { name: /^password$/i }).click()

    const creatingText = walletsCard.getByText(/creating wallet with password recovery/i)
    await expect(creatingText).toBeVisible({ timeout: 30_000 })

    await expect.poll(async () => await walletRowLocator.count(), { timeout: 120_000 }).toBeGreaterThan(initialCount)
  })
})
