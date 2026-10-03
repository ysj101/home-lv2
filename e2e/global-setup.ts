import type { FullConfig } from '@playwright/test'

import { resetDatabase } from './database'
import { ADULT_A, asUser } from './users'

/** 温めておく画面。 */
const WARM_UP_PATHS = ['/', '/tasks', '/settings']

/** 画面を1回取得してステータスを返す。つながらなければ null。 */
async function fetchStatus(url: URL): Promise<number | null> {
  try {
    const response = await fetch(url, { headers: asUser(ADULT_A) })
    // SSR は本文を流しながら描画するので、最後まで読んで描画し切ったことを確かめる。
    await response.text()

    return response.status
  } catch {
    return null
  }
}

/**
 * 起動直後の dev サーバーは、最初のリクエストで SSR のモジュール読み込みが
 * 並行して走り、500 を返すことがある。テストの1件目が巻き込まれないよう、
 * 主要な画面が 200 を返すまで先に叩いておく。
 */
async function warmUp(baseURL: string): Promise<void> {
  const deadline = Date.now() + 30_000

  for (const path of WARM_UP_PATHS) {
    const url = new URL(path, baseURL)

    for (;;) {
      const status = await fetchStatus(url)
      if (status === 200) break

      if (Date.now() > deadline) {
        throw new Error(
          `${url} が 200 を返しません（最後のステータス: ${status ?? '接続失敗'}）`,
        )
      }
      await new Promise((resolve) => setTimeout(resolve, 500))
    }
  }
}

/**
 * E2E はローカル D1 を共有するので、実行のたびに同じ初期状態に戻してから始める。
 * （Move 未登録 / 標準テンプレート投入済み / 家族2人）
 *
 * Playwright は webServer を起動してから globalSetup を呼ぶ。
 * サーバーが DB を開いたあとなので、ファイルを消さずに中身だけ戻す。
 */
export default async function globalSetup(config: FullConfig) {
  resetDatabase()
  await warmUp(config.projects[0].use.baseURL!)
}
