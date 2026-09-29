import { defineConfig, devices } from '@playwright/test'

const PORT = 3000
const baseURL = `http://localhost:${PORT}`

export default defineConfig({
  testDir: './e2e',
  // 毎回ローカル D1 を作り直してから始める。
  globalSetup: './e2e/global-setup.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'desktop-chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 15'] },
    },
  ],
  webServer: {
    command: 'pnpm dev',
    url: baseURL,
    // 毎回 DB を作り直すので、古い接続を掴んだサーバーを使い回さない。
    reuseExistingServer: false,
    timeout: 120 * 1000,
  },
})
