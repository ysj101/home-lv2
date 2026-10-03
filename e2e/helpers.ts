import { expect, type Page } from '@playwright/test'

/**
 * 画面を開き、読み込みが落ち着くまで待つ。
 *
 * dev サーバーではハイドレーション用のチャンクを読み終える前に次の画面へ移ると、
 * WebKit が読み込み中の import を中断する。TanStack Router はそれを
 * チャンクが無いものと見なしてページを再読み込みし、その再読み込みが
 * 次の page.goto を打ち消す。同じページで何度も画面を移るときはこれを使う。
 */
export async function visit(page: Page, url: string): Promise<void> {
  await page.goto(url, { waitUntil: 'networkidle' })
}

/** Quest 一覧の行。フィルターのチップや下部ナビの li と区別する。 */
export const questRows = (page: Page) =>
  page.getByRole('list', { name: 'Quest 一覧' }).getByRole('listitem')

/**
 * 引越しが未登録なら登録する。
 * 02 で登録済みのはずだが、spec を単体で流したときにも動くようにしておく。
 */
export async function ensureMoveRegistered(page: Page): Promise<void> {
  await page.goto('/settings')

  const create = page.getByRole('button', { name: /登録して/ })
  if (!(await create.isVisible().catch(() => false))) return

  await page.getByLabel('引越し名').fill('Home Lv.2')
  await page.getByLabel('引越し日').fill('2026-11-15')
  await create.click()

  await expect(page.getByRole('heading', { name: '引越しの設定' })).toBeVisible({
    timeout: 15000,
  })
}

/** 一覧からタイトル一致の Quest を開く。 */
export async function openTask(page: Page, title: string): Promise<void> {
  await page.goto('/tasks')
  await page.getByRole('link', { name: new RegExp(title) }).first().click()

  await expect(page.getByRole('heading', { name: title })).toBeVisible()
}
