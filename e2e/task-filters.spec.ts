import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial' })

test.beforeAll(async ({ browser }) => {
  const page = await browser.newPage()
  await page.goto('/settings')

  const create = page.getByRole('button', { name: /登録して/ })
  if (await create.isVisible().catch(() => false)) {
    await page.getByLabel('引越し名').fill('Home Lv.2')
    await page.getByLabel('引越し日').fill('2026-11-15')
    await create.click()
    await expect(
      page.getByRole('heading', { name: '引越しの設定' }),
    ).toBeVisible({ timeout: 15000 })
  }
  await page.close()
})

const rows = (page: import('@playwright/test').Page) =>
  page.getByRole('list', { name: 'Quest 一覧' }).getByRole('listitem')

test('状態フィルターで絞り込める', async ({ page }) => {
  await page.goto('/tasks')
  const all = await rows(page).count()

  await page.getByRole('link', { name: '期限超過', exact: true }).click()

  await expect(page).toHaveURL(/status=overdue/)
  const overdue = await rows(page).count()
  expect(overdue).toBeGreaterThan(0)
  expect(overdue).toBeLessThan(all)
})

test('リロードしてもフィルターが保持される', async ({ page }) => {
  await page.goto('/tasks?status=overdue')
  const before = await rows(page).count()

  await page.reload()

  await expect(page).toHaveURL(/status=overdue/)
  expect(await rows(page).count()).toBe(before)
})

test('担当フィルターは同じものを押すと解除される', async ({ page }) => {
  await page.goto('/tasks')

  await page.getByRole('link', { name: '未割当', exact: true }).click()
  await expect(page).toHaveURL(/assignee=unassigned/)

  await page.getByRole('link', { name: '未割当', exact: true }).click()
  await expect(page).not.toHaveURL(/assignee=/)
})

test('カテゴリで絞り込める', async ({ page }) => {
  await page.goto('/tasks')

  await page.getByLabel('カテゴリ').click()
  await page.getByRole('option', { name: '電気・ガス・水道' }).click()

  await expect(page).toHaveURL(/category=utility/)
  // seed のテンプレートで utility は4件。
  await expect(rows(page)).toHaveCount(4)
})

test('条件を組み合わせられる', async ({ page }) => {
  await page.goto('/tasks?status=todo&category=packing')

  await expect(rows(page)).toHaveCount(2)
})

test('不正な条件は無視して全件を出す', async ({ page }) => {
  await page.goto('/tasks?status=bogus&category=travel')

  await expect(rows(page)).toHaveCount(25)
})
