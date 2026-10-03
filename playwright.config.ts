import { defineConfig, devices } from '@playwright/test'

import { ADULT_A, asUser } from './e2e/users'

const PORT = 3000
const baseURL = `http://localhost:${PORT}`

/** モバイル幅でも流す spec。 */
const MOBILE_SPECS = /(12-responsive|13-mvp-scenario)\.spec\.ts/

export default defineConfig({
  testDir: './e2e',
  // 毎回ローカル D1 を初期状態に戻してから始める。
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
    // 既定は Adult A として操作する。.dev.vars の DEV_USER_EMAIL が
    // どちらを指していても結果が変わらないよう、ヘッダで明示する。
    extraHTTPHeaders: asUser(ADULT_A),
  },
  /*
   * ローカル D1 を全テストで共有し、global-setup で1回だけ初期化する。
   * 全 spec を複数プロジェクトで回すと2周目はデータが残った状態で走るので、
   * 機能の検証はデスクトップ1本に任せ、モバイルは見た目の検証と、
   * DB を自前で初期化する通しシナリオ（13-mvp-scenario）だけを担う。
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
      testMatch: MOBILE_SPECS,
    },
    {
      name: 'mobile-small',
      // 375px 幅。想定するいちばん狭い実機（iPhone SE / 8 相当）。
      use: {
        ...devices['iPhone 15'],
        viewport: { width: 375, height: 667 },
      },
      testMatch: MOBILE_SPECS,
    },
  ],
  webServer: {
    command: 'pnpm dev',
    // 起動の確認に URL を使うと、その時点で DB が無い（初回）と 500 になり
    // いつまでも待ち続ける。DB の準備は globalSetup がこのあと行うので、
    // ポートが開いたことだけを見る。
    port: PORT,
    reuseExistingServer: false,
    timeout: 120 * 1000,
  },
})
