import { expect, test } from '@playwright/test'

import { ensureMoveRegistered, openTask, questRows } from './helpers'

test.describe.configure({ mode: 'serial' })

test.beforeAll(async ({ browser }) => {
  const page = await browser.newPage()
  await ensureMoveRegistered(page)
  await page.close()
})

const TITLE = '転入届を提出する'

test('担当を設定すると詳細と一覧の両方に反映される', async ({ page }) => {
  await openTask(page, TITLE)

  await page.getByLabel('担当').click()
  await page.getByRole('option', { name: 'Adult B' }).click()

  await expect(page.getByLabel('担当')).toContainText('Adult B', {
    timeout: 10000,
  })

  await page.goto('/tasks')
  await expect(questRows(page).filter({ hasText: TITLE })).toContainText(
    'Adult B',
  )
})

test('担当フィルターで絞り込める', async ({ page }) => {
  await page.goto('/tasks?assignee=partner')

  await expect(questRows(page).filter({ hasText: TITLE })).toHaveCount(1)
})

test('未割当に戻せる', async ({ page }) => {
  await openTask(page, TITLE)

  await page.getByLabel('担当').click()
  await page.getByRole('option', { name: '未割当' }).click()

  await expect(page.getByLabel('担当')).toContainText('未割当', {
    timeout: 10000,
  })

  await page.goto('/tasks')
  await expect(questRows(page).filter({ hasText: TITLE })).toContainText(
    '未割当',
  )
})

test('選択肢は同じ Household のメンバーだけ', async ({ page }) => {
  await openTask(page, TITLE)

  await page.getByLabel('担当').click()

  await expect(page.getByRole('option')).toHaveCount(3)
  await expect(page.getByRole('option', { name: 'Adult A' })).toBeVisible()
  await expect(page.getByRole('option', { name: 'Adult B' })).toBeVisible()
})
