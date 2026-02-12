import { expect, test } from '../fixtures/test'

test.describe('Dashboard smoke - key cards are present', () => {
  test('shows mode-specific dashboard sections', async ({ page, dashboardPage, mode }) => {
    const m = mode
    await dashboardPage.ensureReady(m)

    // Common: wallets card + signatures input
    await expect(page.getByText(/^wallets$/i).first()).toBeVisible({ timeout: 60_000 })
    await expect(page.getByPlaceholder(/enter a message to sign/i)).toBeVisible({ timeout: 60_000 })

    if (m === 'solana-only') {
      // Solana layout: Signatures, Mint tokens, Session keys (coming soon), Wallets
      await expect(page.getByText(/signatures/i).first()).toBeVisible({ timeout: 60_000 })
      await expect(page.getByText(/mint.*tokens|mint tokens/i).first()).toBeVisible({ timeout: 60_000 })
      await expect(page.getByText(/session key/i).first()).toBeVisible({ timeout: 60_000 })
    } else {
      // EVM layout: Signatures, Write Contract, Switch chain, Session keys, Wallets
      await expect(page.getByText(/write contract/i).first()).toBeVisible({ timeout: 60_000 })
      await expect(page.getByText(/switch chain/i).first()).toBeVisible({ timeout: 60_000 })
      await expect(page.getByText(/session key/i).first()).toBeVisible({ timeout: 60_000 })
      if (m === 'evm-wagmi') {
        // Wagmi also has a Wallet card with embedded + external connectors (below the fold)
        const walletCard = page.getByText(/embedded or external/i).first()
        await walletCard.scrollIntoViewIfNeeded()
        await expect(walletCard).toBeVisible({ timeout: 60_000 })

        // Scroll to bottom so all external connectors are rendered
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
        await page.waitForTimeout(500)

        await expect(page.getByText(/^external$/i).first()).toBeVisible({ timeout: 30_000 })
        await expect(page.getByText(/MetaMask/i).first()).toBeVisible({ timeout: 30_000 })
        await expect(page.getByText(/Coinbase Wallet/i).first()).toBeVisible({ timeout: 30_000 })
        await expect(page.getByText(/WalletConnect/i).first()).toBeVisible({ timeout: 30_000 })
      } else {
        // evm-only: no external wallets
        await expect(page.getByText(/embedded or external/i).first()).not.toBeVisible()
      }
    }
  })
})
