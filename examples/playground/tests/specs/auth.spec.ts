import { expect, test } from '@playwright/test'
import { setPlaygroundMode } from '../utils/mode'
import { clickableByText } from '../utils/ui'

test.describe('auth screen renders correctly', () => {
  test('evm-only: guest + email visible, wallet hidden', async ({ page }) => {
    await setPlaygroundMode(page, 'evm-only')
    await page.goto('/showcase/auth', { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveURL(/\/showcase\/auth/i)

    await expect(page.getByText(/openfort/i).first()).toBeVisible({ timeout: 20_000 })
    await expect(clickableByText(page, /continue as guest|guest/i)).toBeVisible({ timeout: 20_000 })
    await expect(clickableByText(page, /continue with email/i)).toBeVisible({ timeout: 20_000 })
    await expect(clickableByText(page, /continue with wallet/i)).not.toBeVisible()
  })

  test('solana-only: guest + email visible, wallet hidden', async ({ page }) => {
    await setPlaygroundMode(page, 'solana-only')
    await page.goto('/showcase/auth', { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveURL(/\/showcase\/auth/i)

    await expect(page.getByText(/openfort/i).first()).toBeVisible({ timeout: 20_000 })
    await expect(clickableByText(page, /continue as guest|guest/i)).toBeVisible({ timeout: 20_000 })
    await expect(clickableByText(page, /continue with email/i)).toBeVisible({ timeout: 20_000 })
    await expect(clickableByText(page, /continue with wallet/i)).not.toBeVisible()
  })

  test('evm-wagmi: guest + email + wallet visible', async ({ page }) => {
    await setPlaygroundMode(page, 'evm-wagmi')
    await page.goto('/showcase/auth', { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveURL(/\/showcase\/auth/i)

    await expect(page.getByText(/openfort/i).first()).toBeVisible({ timeout: 20_000 })
    await expect(clickableByText(page, /continue as guest|guest/i)).toBeVisible({ timeout: 20_000 })
    await expect(clickableByText(page, /continue with email/i)).toBeVisible({ timeout: 20_000 })
    await expect(clickableByText(page, /continue with wallet/i)).toBeVisible({ timeout: 20_000 })
  })
})
