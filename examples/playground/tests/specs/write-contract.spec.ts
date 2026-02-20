import { expect, test } from '../fixtures/test'

test.describe('Write Contract - mint tokens', () => {
  test('new wallet balance is 0 and mint shows transaction hash', async ({ page, dashboardPage }) => {
    // Ensure session and dashboard are ready
    await dashboardPage.ensureReady()

    // Wallets card
    const walletsTitle = page
      .locator('[data-slot="card-title"]')
      .filter({ hasText: /^wallets$/i })
      .first()
    await expect(walletsTitle).toBeVisible({ timeout: 60_000 })
    const walletsCard = walletsTitle.locator('xpath=ancestor::*[@data-slot="card"][1]')

    await walletsCard.getByRole('button', { name: /create new wallet/i }).click()
    await walletsCard.getByRole('button', { name: /smart account/i }).click()
    await walletsCard.getByRole('button', { name: /^password$/i }).click()

    const walletRowLocator = walletsCard.locator('button').filter({
      hasText: /0x[a-f0-9]{4,}\.\.\.[a-f0-9]{4,}/i,
    })

    let initialCount = await walletRowLocator.count()

    await expect(walletsCard.getByText(/^creating wallet with password recovery/i)).toBeVisible({ timeout: 30_000 })
    await expect.poll(async () => await walletRowLocator.count(), { timeout: 120_000 }).toBeGreaterThan(initialCount)

    // Card "Write Contract"
    const writeCard = await dashboardPage.getCardByTitle(/write contract/i)

    await expect(writeCard).toBeVisible({ timeout: 60_000 })

    // initial balance
    await expect(writeCard.getByText(/balance:\s*0\b/i)).toBeVisible({ timeout: 60_000 })

    // Amount to mint
    const amountInput = writeCard.getByPlaceholder(/enter amount to mint/i)
    await expect(amountInput).toBeVisible({ timeout: 30_000 })
    await amountInput.fill('7')

    // Mint tokens
    const mintBtn = writeCard.getByRole('button', { name: /mint tokens/i })
    await expect(mintBtn).toBeVisible({ timeout: 30_000 })
    await mintBtn.click()

    // Transaction hash visible
    const txHashRegex = /transaction hash:\s*0x[a-fA-F0-9]{6,}/i
    await expect(page.getByText(txHashRegex)).toBeVisible({ timeout: 90_000 })
  })
})
