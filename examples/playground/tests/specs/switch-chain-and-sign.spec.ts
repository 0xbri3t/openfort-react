import { expect, test } from '../fixtures/test'

test.describe('Dashboard integration - chain + signatures', () => {
  test('switch chain -> sign message -> chain stays selected', async ({ dashboardPage, mode }) => {
    const m = mode
    await dashboardPage.ensureReady(m)

    const chainCard = await dashboardPage.getCardByTitle(/switch chain/i)

    const currentChain = chainCard
      .locator('p')
      .filter({ hasText: /^current chain:/i })
      .first()
    await expect(currentChain).toBeVisible({ timeout: 30_000 })

    const target = 'Base Sepolia'

    const btn = chainCard.getByRole('button', { name: new RegExp(`^switch to\\s+${escapeRegExp(target)}$`, 'i') })
    if (!(await btn.isDisabled().catch(() => false))) {
      await btn.click()
    }

    const successMsg = chainCard.getByText(new RegExp(`^switched to chain\\s+${escapeRegExp(target)}$`, 'i'))
    await expect(successMsg).toBeVisible({ timeout: 90_000 })
    await expect(currentChain).toContainText(new RegExp(target, 'i'), { timeout: 90_000 })
    await new Promise((r) => setTimeout(r, 2000))
    const msg = `Chain-sign ${Date.now()}`
    await dashboardPage.signMessage(msg, m)

    await expect(currentChain).toContainText(/base sepolia/i, { timeout: 30_000 })
  })
})

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
