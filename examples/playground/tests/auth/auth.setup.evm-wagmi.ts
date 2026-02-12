import fs from 'node:fs'
import path from 'node:path'
import { expect, test } from '@playwright/test'
import { AuthPage } from '../pages/auth.page'
import { DashboardPage } from '../pages/dashboard.page'
import { AUTH_STATE_EVM_WAGMI, TEST_RESULTS_DIR } from '../utils/constants'
import { setPlaygroundMode } from '../utils/mode'

test('setup: create guest wallet (evm-wagmi) and persist auth state', async ({ page }) => {
  fs.mkdirSync(path.dirname(AUTH_STATE_EVM_WAGMI), { recursive: true })
  fs.mkdirSync(TEST_RESULTS_DIR, { recursive: true })

  await setPlaygroundMode(page, 'evm-wagmi')

  const auth = new AuthPage(page)
  const dash = new DashboardPage(page)

  await auth.goto()
  await auth.openConnectModalFromNavbar()
  await auth.continueAsGuest('evm-wagmi')

  await dash.expectLoaded('evm-wagmi')

  await page.context().storageState({ path: AUTH_STATE_EVM_WAGMI })
  expect(fs.existsSync(AUTH_STATE_EVM_WAGMI)).toBeTruthy()
})
