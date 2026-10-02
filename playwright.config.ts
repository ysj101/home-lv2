import { defineConfig, devices } from '@playwright/test'

const PORT = 3000
const baseURL = `http://localhost:${PORT}`

export default defineConfig({
  testDir: './e2e',
  // 毎回ローカル D1 を作り直してから始める。
  globalSetup: './e2e/global-setup.ts',
  // ローカル D1 を全テストで共有するので直列に流す。
  // 並列にすると、複数の spec がそれぞれ引越しを登録してしまう。
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  /*
   * ローカル D1 を全テストで共有し、global-setup で1回だけ作り直す。
   * 全 spec を複数プロジェクトで回すと2周目はデータが残った状態で走るので、
   * 機能の検証はデスクトップ1本に任せ、モバイルは見た目の検証だけを担う。
   */
  projects: [
    {
      name: 'desktop-chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-safari',
      // 390px 幅。spec §25 Mobile First の主対象。
      use: { ...devices['iPhone 15'] },
      testMatch: /12-responsive\.spec\.ts/,
    },
    {
      name: 'mobile-small',
      // 375px 幅。想定するいちばん狭い実機（iPhone SE / 8 相当）。
      use: {
        ...devices['iPhone 15'],
        viewport: { width: 375, height: 667 },
      },
      testMatch: /12-responsive\.spec\.ts/,
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
