import { expect, test } from '@playwright/test'
import { setPlaygroundMode } from '../utils/mode'
import { clickableByText } from '../utils/ui'

test.describe('auth screen renders correctly', () => {
  test('svm: guest + email visible, wallet hidden', async ({ page }) => {
    await setPlaygroundMode(page, 'svm')
    await page.goto('/showcase/auth', { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveURL(/\/showcase\/auth/i)

    await expect(page.getByText(/openfort/i).first()).toBeVisible({ timeout: 20_000 })
    await expect(clickableByText(page, /continue as guest|guest/i)).toBeVisible({ timeout: 20_000 })
    await expect(clickableByText(page, /continue with email/i)).toBeVisible({ timeout: 20_000 })
    const walletBtn = clickableByText(page, /continue with wallet/i)
    await expect(walletBtn).toBeVisible({ timeout: 20_000 })
    await expect(walletBtn).toBeDisabled()
  })

  test('evm: guest + email + wallet visible', async ({ page }) => {
    await setPlaygroundMode(page, 'evm')
    await page.goto('/showcase/auth', { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveURL(/\/showcase\/auth/i)

    await expect(page.getByText(/openfort/i).first()).toBeVisible({ timeout: 20_000 })
    await expect(clickableByText(page, /continue as guest|guest/i)).toBeVisible({ timeout: 20_000 })
    await expect(clickableByText(page, /continue with email/i)).toBeVisible({ timeout: 20_000 })
    await expect(clickableByText(page, /continue with wallet/i)).toBeVisible({ timeout: 20_000 })
  })
})
