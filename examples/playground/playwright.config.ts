import path from 'node:path'
import { defineConfig, devices } from '@playwright/test'
import { AUTH_STATE_EVM_ONLY, AUTH_STATE_SOLANA, ROOT_OUT, TEST_RESULTS_DIR } from './tests/utils/constants'

const PORT = Number(process.env.PLAYGROUND_PORT ?? 5173)
const BASE_URL = process.env.PLAYGROUND_BASE_URL ?? `http://localhost:${PORT}`

const REPORT_DIR = path.join(ROOT_OUT, 'playwright-report')

export default defineConfig({
  testDir: './tests',

  timeout: 90_000,
  expect: { timeout: 30_000 },

  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : 4,
  fullyParallel: false,

  reporter: [['list'], ['html', { outputFolder: REPORT_DIR, open: 'never' }]],

  outputDir: TEST_RESULTS_DIR,

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
    actionTimeout: 30_000,
    navigationTimeout: 45_000,
    viewport: { width: 1440, height: 900 },
  },

  projects: [
    {
      name: 'setup-evm-only',
      testMatch: /auth\.setup\.evm-only\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'setup-solana',
      testMatch: /auth\.setup\.solana\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'chromium-evm-only',
      dependencies: ['setup-evm-only'],
      testIgnore: [
        /auth\.spec\.ts/, // needs unauthenticated
        /wallet-entry\.spec\.ts/, // needs unauthenticated
        /solana-mint\.spec\.ts/, // Solana-only
      ],
      testMatch: /.*\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        storageState: AUTH_STATE_EVM_ONLY,
      },
    },
    {
      name: 'chromium-evm-wagmi',
      testIgnore: [
        /auth\.spec\.ts/, // needs unauthenticated
        /wallet-entry\.spec\.ts/, // needs unauthenticated
        /solana-mint\.spec\.ts/, // Solana-only
        /refresh-persistence\.spec\.ts/, // wagmi state is in-memory; reload loses connection
      ],
      testMatch: /.*\.spec\.ts/,
      timeout: 180_000,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'chromium-solana',
      dependencies: ['setup-solana'],
      testIgnore: [
        /auth\.spec\.ts/, // needs unauthenticated
        /wallet-entry\.spec\.ts/, // needs unauthenticated
        /switch-chain\.spec\.ts/, // EVM-only
        /switch-chain-and-sign\.spec\.ts/, // EVM-only
        /write-contract\.spec\.ts/, // EVM-only
        /mint-without-ammount\.spec\.ts/, // EVM-only
        /session-keys-multi-delete\.spec\.ts/, // EVM-only
        /refresh-persistence\.spec\.ts/, // EVM-only
        /create-wallet-and-switch-chain\.spec\.ts/, // EVM-only
      ],
      testMatch: /.*\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        storageState: AUTH_STATE_SOLANA,
      },
    },

    {
      name: 'unauthenticated',
      testMatch: /(wallet-entry|auth)\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'pnpm dev',
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
  },
})
