import { expect, test } from '@playwright/test'

import {
  TASK_DETAIL_URL,
  ensureMoveRegistered,
  questRows,
  sectionRows,
} from './helpers'

test.describe.configure({ mode: 'serial' })

test.beforeAll(async ({ browser }) => {
  const page = await browser.newPage()
  await ensureMoveRegistered(page)
  await page.close()
})

test('4つのセクションが並ぶ', async ({ page }) => {
  await page.goto('/')

  for (const title of [
    '期限超過',
    '今日やること',
    '今週やること',
    '最近完了した Quest',
  ]) {
    await expect(page.getByRole('heading', { name: new RegExp(title) })).toBeVisible()
  }
})

test('期限超過セクションの件数が Overdue と一致する', async ({ page }) => {
  await page.goto('/tasks?status=overdue')
  const overdue = await questRows(page).count()

  await page.goto('/')

  // 1セクションは最大5件までなので、それを超えたら5件だけ出る。
  await expect(sectionRows(page, '期限超過')).toHaveCount(Math.min(overdue, 5))
})

test('セクションの行から完了にできる', async ({ page }) => {
  await page.goto('/')

  // どのセクションに出るかは実行時のデータ次第なので、未完了の行を1つ拾う。
  const row = page
    .getByRole('list', { name: /の Quest$/ })
    .getByRole('listitem')
    .filter({ has: page.getByRole('checkbox', { checked: false }) })
    .first()
  const title = (await row.getByRole('link').textContent())!
    .split('期限')[0]
    .trim()

  await row.getByRole('checkbox').click()

  await page.goto('/tasks?status=completed')
  await expect(questRows(page).filter({ hasText: title })).toHaveCount(1)
})

test('完了した Quest が最近完了セクションに出る', async ({ page }) => {
  await page.goto('/')

  await expect(sectionRows(page, '最近完了した Quest').first()).toContainText(
    'Cleared',
  )
})

test('セクションの行から詳細へ遷移できる', async ({ page }) => {
  await page.goto('/')

  await page
    .getByRole('list', { name: /の Quest$/ })
    .getByRole('listitem')
    .first()
    .getByRole('link')
    .click()

  await expect(page).toHaveURL(TASK_DETAIL_URL)
})

test('5件までしか出さず、超えたら「すべて見る」で一覧へ繋がる', async ({
  page,
}) => {
  // 最近完了が5件を超える状況を作る。
  for (let i = 0; i < 6; i += 1) {
    await page.goto('/tasks?status=todo')
    const before = await questRows(page).count()
    await questRows(page).first().getByRole('checkbox').click()
    await expect(questRows(page)).toHaveCount(before - 1, { timeout: 10000 })
  }

  await page.goto('/')

  // 出るのは5件まで。
  await expect(sectionRows(page, '最近完了した Quest')).toHaveCount(5)

  const seeAll = page
    .getByRole('heading', { name: /最近完了した Quest/ })
    .locator('..')
    .getByRole('link', { name: 'すべて見る' })
  await seeAll.click()

  await expect(page).toHaveURL(/status=completed/)
})
