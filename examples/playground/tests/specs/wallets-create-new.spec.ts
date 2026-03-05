import { expect, test } from '../fixtures/test'
import { EVM_ADDRESS_REGEX, SOLANA_ADDRESS_DISPLAY_REGEX } from '../utils/mode'

test.describe('Wallets - create new wallet', () => {
  test('shows existing wallet, offers 3 creation methods, shows creating text, and creates a new wallet via Password', async ({
    page,
    dashboardPage,
    mode,
  }) => {
    const m = mode
    await dashboardPage.ensureReady(m)

    const walletsTitle = page
      .locator('[data-slot="card-title"]')
      .filter({ hasText: /^wallets$/i })
      .first()

    await expect(walletsTitle).toBeVisible({ timeout: 60_000 })

    const walletsCard = walletsTitle.locator('xpath=ancestor::*[@data-slot="card"][1]')
    await expect(walletsCard).toBeVisible({ timeout: 60_000 })

    const addressRegex = m === 'svm' ? SOLANA_ADDRESS_DISPLAY_REGEX : EVM_ADDRESS_REGEX
    const walletRowLocator = walletsCard.locator('button').filter({
      hasText: addressRegex,
    })

    const initialCount = await walletRowLocator.count()
    expect(initialCount).toBeGreaterThanOrEqual(1)

    // Create new wallet
    const createNewBtn = walletsCard.getByRole('button', {
      name: /create new wallet/i,
    })
    await expect(createNewBtn).toBeVisible({ timeout: 30_000 })
    await createNewBtn.click()

    if (m !== 'svm') {
      await walletsCard.getByRole('button', { name: /smart account/i }).click()
    }

    // Available options
    const automaticBtn = walletsCard.getByRole('button', {
      name: /^automatic$/i,
    })
    const passwordBtn = walletsCard.getByRole('button', {
      name: /^password$/i,
    })
    const passkeyBtn = walletsCard.getByRole('button', {
      name: /^passkey$/i,
    })

    await expect(automaticBtn).toBeVisible({ timeout: 30_000 })
    await expect(passwordBtn).toBeVisible({ timeout: 30_000 })
    await expect(passkeyBtn).toBeVisible({ timeout: 30_000 })

    // Create wallet with password
    await passwordBtn.click()

    // Creation text visible
    const creatingWalletText = walletsCard.getByText(/^creating wallet with password recovery/i)
    await expect(creatingWalletText).toBeVisible({ timeout: 30_000 })

    // Wait until new wallet appears
    await expect.poll(async () => await walletRowLocator.count(), { timeout: 120_000 }).toBeGreaterThan(initialCount)

    const finalCount = await walletRowLocator.count()
    expect(finalCount).toBeGreaterThanOrEqual(2)
  })

  test('creates Smart Account wallet with Automatic recovery', async ({ page, dashboardPage, mode }) => {
    test.skip(mode === 'svm', 'Smart Account wallet type is EVM only')
    test.setTimeout(180_000)
    await dashboardPage.ensureReady(mode)

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
    await walletsCard.getByRole('button', { name: /smart account/i }).click()
    await walletsCard.getByRole('button', { name: /^automatic$/i }).click()

    const creatingText = walletsCard.getByText(/creating wallet with automatic recovery/i)
    await expect(creatingText).toBeVisible({ timeout: 30_000 })

    await expect.poll(async () => await walletRowLocator.count(), { timeout: 120_000 }).toBeGreaterThan(initialCount)
  })
})
