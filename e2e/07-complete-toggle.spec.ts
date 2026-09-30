import { expect, test } from '@playwright/test'

import { ensureMoveRegistered, questRows } from './helpers'

test.describe.configure({ mode: 'serial' })

test.beforeAll(async ({ browser }) => {
  const page = await browser.newPage()
  await ensureMoveRegistered(page)
  await page.close()
})

const TITLE = '郵便物の転送届を出す'

test('一覧のチェックで完了にできる', async ({ page }) => {
  await page.goto('/tasks')
  const row = questRows(page).filter({ hasText: TITLE })

  // サーバー往復のあとに状態が変わるので check() ではなく click() + 待機。
  await row.getByRole('checkbox').click()

  await expect(row.getByRole('checkbox')).toBeChecked({ timeout: 10000 })
  // 完了者の名前が出る。
  await expect(row).toContainText('Cleared by Adult A')
})

test('リロードしても完了状態が残る', async ({ page }) => {
  await page.goto('/tasks')

  await expect(
    questRows(page).filter({ hasText: TITLE }).getByRole('checkbox'),
  ).toBeChecked()
})

test('完了フィルターに現れ、未完了フィルターから消える', async ({ page }) => {
  await page.goto('/tasks?status=completed')
  await expect(questRows(page).filter({ hasText: TITLE })).toHaveCount(1)

  await page.goto('/tasks?status=todo')
  await expect(questRows(page).filter({ hasText: TITLE })).toHaveCount(0)
})

test('詳細に完了日と完了者が出る', async ({ page }) => {
  await page.goto('/tasks')
  await page.getByRole('link', { name: new RegExp(TITLE) }).first().click()

  await expect(page.getByText(/Adult A が完了/)).toBeVisible()
  await expect(page.getByRole('button', { name: '再オープンする' })).toBeVisible()
})

test('詳細から再オープンすると完了情報が消える', async ({ page }) => {
  await page.goto('/tasks')
  await page.getByRole('link', { name: new RegExp(TITLE) }).first().click()

  await page.getByRole('button', { name: '再オープンする' }).click()

  await expect(page.getByRole('button', { name: 'Clear!' })).toBeVisible()
  await expect(page.getByText(/が完了/)).toHaveCount(0)

  await page.goto('/tasks')
  await expect(
    questRows(page).filter({ hasText: TITLE }).getByRole('checkbox'),
  ).not.toBeChecked()
})
