import { expect, test } from '../fixtures/test'

test.describe('Dashboard smoke - key cards are present', () => {
  test.describe.configure({ retries: 1 })
  test('shows mode-specific dashboard sections', async ({ page, dashboardPage, mode }) => {
    const m = mode
    await dashboardPage.ensureReady(m)

    // Common: wallets card + signatures input
    await expect(page.getByText(/^wallets$/i).first()).toBeVisible({ timeout: 60_000 })
    await expect(page.getByPlaceholder(/enter a message to sign/i)).toBeVisible({ timeout: 60_000 })

    if (m === 'svm') {
      // SVM layout: Signatures, Send SOL, Transaction History, Wallets
      await expect(page.getByText(/signatures/i).first()).toBeVisible({ timeout: 60_000 })
      await expect(page.getByText(/send sol/i).first()).toBeVisible({ timeout: 60_000 })
      await expect(page.getByText(/transaction history/i).first()).toBeVisible({ timeout: 60_000 })
    } else {
      // EVM layout: Signatures, Write Contract, Switch chain, Session keys, Wallets
      await expect(page.getByText(/write contract/i).first()).toBeVisible({ timeout: 60_000 })
      await expect(page.getByText(/switch chain/i).first()).toBeVisible({ timeout: 60_000 })
      await expect(page.getByText(/session key/i).first()).toBeVisible({ timeout: 60_000 })
      if (m === 'evm') {
        // Scroll to bottom so all external connectors are rendered
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
        await page.waitForTimeout(500)

        await expect(page.getByText(/^external$/i).first()).toBeVisible({ timeout: 30_000 })
        await expect(page.getByRole('button', { name: /MetaMask/i })).toBeVisible({ timeout: 30_000 })
        await expect(page.getByRole('button', { name: /Coinbase Wallet/i })).toBeVisible({ timeout: 30_000 })
        await expect(page.getByRole('button', { name: /WalletConnect/i })).toBeVisible({ timeout: 30_000 })
      }
    }
  })
})
