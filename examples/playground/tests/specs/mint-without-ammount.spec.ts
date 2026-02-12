import { expect, test } from '../fixtures/test'
import { EVM_TX_HASH_REGEX } from '../utils/mode'

test.describe('Dashboard negative - write contract validation', () => {
  test('mint without amount does not produce transaction hash', async ({ page, dashboardPage, mode }) => {
    test.setTimeout(120_000)
    const m = mode
    await dashboardPage.ensureReady(m)

    const writeCard = await dashboardPage.getCardByTitle(/write contract/i)

    const amountInput = writeCard.getByPlaceholder(/enter amount to mint/i)
    await expect(amountInput).toBeVisible({ timeout: 30_000 })

    await amountInput.fill('')

    const mintBtn = writeCard.getByRole('button', { name: /mint tokens/i })
    await expect(mintBtn).toBeVisible({ timeout: 30_000 })
    await mintBtn.click()

    await expect(page.getByText(EVM_TX_HASH_REGEX))
      .toHaveCount(0, { timeout: 3_000 })
      .catch(() => {})
  })
})
