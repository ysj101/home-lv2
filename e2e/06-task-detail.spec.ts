import { expect, test } from '@playwright/test'

import { ensureMoveRegistered, openTask, questRows } from './helpers'

test.describe.configure({ mode: 'serial' })

test.beforeAll(async ({ browser }) => {
  const page = await browser.newPage()
  await ensureMoveRegistered(page)
  await page.close()
})

test('詳細にタイトル・カテゴリ・テンプレートバッジが出る', async ({ page }) => {
  await openTask(page, '電気の停止・開始手続き')

  await expect(page.getByText('電気・ガス・水道').first()).toBeVisible()
  await expect(page.getByText('標準 Quest')).toBeVisible()
  await expect(page.getByLabel('期限')).toHaveValue('2026-11-08')
})

test('編集して保存すると一覧にも反映される', async ({ page }) => {
  await openTask(page, '荷造りを始める（普段使わないものから）')

  await page.getByLabel('タイトル').fill('荷造りを始める')
  await page.getByLabel('期限').fill('2026-10-20')
  await page.getByRole('button', { name: '保存する' }).click()

  await expect(page.getByRole('heading', { name: '荷造りを始める' })).toBeVisible()

  await page.goto('/tasks')
  await expect(
    questRows(page).filter({ hasText: '荷造りを始める' }),
  ).toContainText('期限 10/20')
})

test('タイトルを空にするとサーバー側で弾かれる', async ({ page }) => {
  await openTask(page, '転出届を提出する')

  await page
    .getByLabel('タイトル')
    .evaluate((el) => el.removeAttribute('required'))
  await page.getByLabel('タイトル').fill('   ')
  await page.getByRole('button', { name: '保存する' }).click()

  await expect(page.getByRole('alert')).toContainText(
    'タイトルを入力してください',
  )
})

test('削除は確認してから実行され、一覧から消える', async ({ page }) => {
  await page.goto('/tasks')
  const before = await questRows(page).count()

  await openTask(page, '不用品を処分する')
  await page.getByRole('button', { name: 'この Quest を削除する' }).click()

  const dialog = page.getByRole('dialog')
  await expect(dialog).toContainText('元に戻せません')
  await dialog.getByRole('button', { name: '削除する' }).click()

  await expect(page).toHaveURL(/\/tasks$/)
  await expect(questRows(page)).toHaveCount(before - 1)
  await expect(questRows(page).filter({ hasText: '不用品を処分する' })).toHaveCount(0)
})

test('存在しない Quest は見つからない旨を出す', async ({ page }) => {
  await page.goto('/tasks/00000000-0000-4000-8000-000000000000')

  await expect(page.getByText('この Quest は見つかりませんでした。')).toBeVisible()
})
