import { expect, test } from '../fixtures/test'
import { EVM_TX_HASH_REGEX } from '../utils/mode'

test.describe('Write Contract - mint tokens', () => {
  test('new wallet balance is 0 and mint shows transaction hash', async ({ page, dashboardPage, mode }) => {
    const m = mode
    await dashboardPage.ensureReady(m)

    const writeCard = await dashboardPage.getCardByTitle(/write contract/i)

    await expect(writeCard).toBeVisible({ timeout: 60_000 })
    await expect(writeCard.getByText(/balance:\s*\d+/i)).toBeVisible({ timeout: 60_000 })
    await page.waitForTimeout(1500)

    const amountInput = writeCard.getByPlaceholder(/enter amount to mint/i)
    await expect(amountInput).toBeVisible({ timeout: 30_000 })
    await amountInput.fill('7')

    const mintBtn = writeCard.getByRole('button', { name: /mint tokens/i })
    await expect(mintBtn).toBeVisible({ timeout: 30_000 })
    await mintBtn.click()

    await expect(page.getByText(EVM_TX_HASH_REGEX)).toBeVisible({ timeout: 120_000 })
  })
})
