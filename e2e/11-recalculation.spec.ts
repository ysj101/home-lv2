import { expect, test } from '@playwright/test'

import { ensureMoveRegistered, questRows } from './helpers'

test.describe.configure({ mode: 'serial' })

test.beforeAll(async ({ browser }) => {
  const page = await browser.newPage()
  await ensureMoveRegistered(page)
  await page.close()
})

/** 引越し日を変更して保存する。 */
async function changeMoveDate(
  page: import('@playwright/test').Page,
  date: string,
) {
  await page.goto('/settings')
  await page.getByLabel('引越し日').fill(date)
  await Promise.all([
    page.waitForResponse((r) => r.request().method() === 'POST'),
    page.getByRole('button', { name: '保存する' }).click(),
  ])
}

test('引越し日を変えると対象 Quest の新旧の期限が出る', async ({ page }) => {
  await changeMoveDate(page, '2026-12-01')

  const dialog = page.getByRole('dialog')
  await expect(dialog).toContainText('Quest の期限も更新しますか？')
  await expect(dialog).toContainText('完了済みの Quest')

  const changes = dialog.getByRole('list', { name: '期限が変わる Quest' })
  expect(await changes.getByRole('listitem').count()).toBeGreaterThan(0)
  // 新旧が矢印でつながって出る。
  await expect(changes.getByRole('listitem').first()).toContainText('→')
})

test('「引越し日だけ変更」なら期限は据え置かれる', async ({ page }) => {
  await page.goto('/tasks')
  const before = await questRows(page)
    .filter({ hasText: '電気の停止・開始手続き' })
    .textContent()

  await changeMoveDate(page, '2026-12-10')
  await page.getByRole('button', { name: '引越し日だけ変更' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)

  await page.goto('/tasks')
  await expect(
    questRows(page).filter({ hasText: '電気の停止・開始手続き' }),
  ).toHaveText(before!)
})

test('「期限も更新する」で対象の期限が更新される', async ({ page }) => {
  // 引越し日 2026-12-20 の -7 日 = 2026-12-13。
  await changeMoveDate(page, '2026-12-20')
  await page.getByRole('button', { name: '期限も更新する' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)

  await page.goto('/tasks')
  await expect(
    questRows(page).filter({ hasText: '電気の停止・開始手続き' }),
  ).toContainText('期限 12/13')
})

test('引越し日を変えなければダイアログは出ない', async ({ page }) => {
  await page.goto('/settings')
  await page.getByLabel('引越し名').fill('Home Lv.2')
  await Promise.all([
    page.waitForResponse((r) => r.request().method() === 'POST'),
    page.getByRole('button', { name: '保存する' }).click(),
  ])

  await expect(page.getByRole('dialog')).toHaveCount(0)
})
