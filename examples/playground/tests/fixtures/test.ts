import { test as base } from '@playwright/test'
import { AuthPage } from '../pages/auth.page'
import { DashboardPage } from '../pages/dashboard.page'
import { getModeFromProjectName, type PlaygroundMode, setPlaygroundMode } from '../utils/mode'

type Fixtures = {
  authPage: AuthPage
  dashboardPage: DashboardPage
  /** Runs inline guest login for evm (wagmi state is in-memory, cannot use storageState). */
  evmLogin: undefined
  mode: PlaygroundMode
}

export const test = base.extend<Fixtures>({
  // biome-ignore lint/correctness/noEmptyPattern: Playwright fixtures require object destructuring
  mode: async ({}, use, testInfo) => {
    const mode = getModeFromProjectName(testInfo.project.name)
    await use(mode)
  },
  authPage: async ({ page }, use) => {
    await use(new AuthPage(page))
  },
  evmLogin: async ({ page, mode }, use) => {
    if (mode === 'evm') {
      await setPlaygroundMode(page, 'evm')
      const auth = new AuthPage(page)
      const dash = new DashboardPage(page)
      await auth.goto()
      await auth.openConnectModalFromNavbar()
      await auth.continueAsGuest('evm')
      await dash.expectLoaded('evm')
    }
    await use(undefined)
  },
  dashboardPage: async ({ page, evmLogin: _evmLogin }, use) => {
    await use(new DashboardPage(page))
  },
})

export { expect } from '@playwright/test'
