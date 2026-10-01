import { expect, test } from '@playwright/test'

import { ensureMoveRegistered, questRows } from './helpers'

test.describe.configure({ mode: 'serial' })

test.beforeAll(async ({ browser }) => {
  const page = await browser.newPage()
  await ensureMoveRegistered(page)
  await page.close()
})

test('Main Quest 名とカウントダウンが出る', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByText('Main Quest')).toBeVisible()
  await expect(page.getByRole('heading', { name: /Home Lv\.2/ })).toBeVisible()
  await expect(page.getByText('引越しまで')).toBeVisible()
  await expect(page.getByText('2026-11-15')).toBeVisible()
})

test('進捗率が Task の完了状況と一致する', async ({ page }) => {
  await page.goto('/tasks')
  const total = await questRows(page).count()
  await page.goto('/tasks?status=completed')
  const completed = await questRows(page).count()

  await page.goto('/')

  const expected = Math.round((completed / total) * 100)
  await expect(page.getByRole('progressbar')).toHaveAttribute(
    'aria-valuenow',
    String(expected),
  )
  await expect(page.getByText(`${expected}%`)).toBeVisible()
})

test('Cleared / Remaining / Overdue の件数が出る', async ({ page }) => {
  await page.goto('/tasks?status=overdue')
  const overdue = await questRows(page).count()

  await page.goto('/')

  const counts = page.getByRole('listitem')
  await expect(counts.filter({ hasText: 'Cleared' })).toBeVisible()
  await expect(counts.filter({ hasText: 'Remaining' })).toBeVisible()
  await expect(counts.filter({ hasText: 'Overdue' })).toContainText(
    String(overdue),
  )
})

test('完了にすると進捗が進む', async ({ page }) => {
  await page.goto('/')
  const before = Number(
    await page.getByRole('progressbar').getAttribute('aria-valuenow'),
  )

  // 未完了フィルターで1件完了にすると、その行は一覧から消える。
  await page.goto('/tasks?status=todo')
  const remainingBefore = await questRows(page).count()
  await questRows(page).first().getByRole('checkbox').click()
  await expect(questRows(page)).toHaveCount(remainingBefore - 1, { timeout: 10000 })

  await page.goto('/')
  const after = Number(
    await page.getByRole('progressbar').getAttribute('aria-valuenow'),
  )
  expect(after).toBeGreaterThan(before)
})

test('スマートフォン幅で横スクロールが出ない', async ({ page }) => {
  await page.goto('/')

  const overflows = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  )
  expect(overflows).toBe(false)
})
