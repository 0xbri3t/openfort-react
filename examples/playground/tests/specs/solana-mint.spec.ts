import { expect, test } from '../fixtures/test'

test.describe('Solana - mint devnet SOL', () => {
  test('can mint devnet SOL (self-transfer) and shows tx signature', async ({ page, dashboardPage }) => {
    await dashboardPage.ensureReady('solana-only')

    const mintCard = await dashboardPage.getCardByTitle(/mint tokens/i)
    await expect(mintCard).toBeVisible({ timeout: 60_000 })

    const amountInput = mintCard.getByPlaceholder(/enter amount to mint.*sol/i)
    await expect(amountInput).toBeVisible({ timeout: 30_000 })
    await amountInput.fill('0.001')

    const mintBtn = mintCard.getByRole('button', { name: /mint tokens/i })
    await expect(mintBtn).toBeVisible({ timeout: 30_000 })
    await mintBtn.click()

    await expect(page.getByText(/tx:\s*[1-9A-HJ-NP-Za-km-z]{8,}/i)).toBeVisible({ timeout: 90_000 })
  })
})
