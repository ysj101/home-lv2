import { expect, test } from '@playwright/test'

import { ensureMoveRegistered, openTask, questRows, visit } from './helpers'

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

test('保存すると一覧に戻り、変更が反映されている', async ({ page }) => {
  await openTask(page, '荷造りを始める（普段使わないものから）')

  await page.getByLabel('タイトル').fill('荷造りを始める')
  await page.getByLabel('期限').fill('2026-10-20')
  await page.getByRole('button', { name: '保存する' }).click()

  await expect(page).toHaveURL(/\/tasks$/)
  await expect(
    questRows(page).filter({ hasText: '荷造りを始める' }),
  ).toContainText('期限 10/20')
})

// ハイドレーション前にリンクを押すとブラウザの通常の遷移になり、戻り先の履歴が
// 残らない。前の画面に戻ることを確かめるテストは visit() で開いてから押す。
test('絞り込み付きの一覧から開いたら、同じ条件の一覧に戻る', async ({ page }) => {
  await visit(page, '/tasks?category=packing')
  await page.getByRole('link', { name: /ベランダの片付け/ }).click()
  await expect(
    page.getByRole('heading', { name: 'ベランダの片付け' }),
  ).toBeVisible()

  await page.getByLabel('期限').fill('2026-11-12')
  await page.getByRole('button', { name: '保存する' }).click()

  await expect(page).toHaveURL(/\/tasks\?category=packing$/)
  await expect(
    questRows(page).filter({ hasText: 'ベランダの片付け' }),
  ).toContainText('期限 11/12')
})

test('Dashboard から開いたら Dashboard に戻る', async ({ page }) => {
  await visit(page, '/')
  await page
    .getByRole('list', { name: '期限超過 の Quest' })
    .getByRole('link')
    .first()
    .click()
  await expect(page).toHaveURL(/\/tasks\/[0-9a-f-]{36}$/)

  await page.getByRole('button', { name: '保存する' }).click()

  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByText('Main Quest')).toBeVisible()
})

test('URL を直接開いて保存したら一覧に移る', async ({ page }) => {
  await page.goto('/tasks')
  const href = await page
    .getByRole('link', { name: /新居の採寸と家具配置を決める/ })
    .getAttribute('href')

  // 前の画面が無い状態にするため、詳細の URL を直接開く。
  await page.goto(href!)
  await page.getByLabel('説明').fill('冷蔵庫の搬入経路も測る')
  await page.getByRole('button', { name: '保存する' }).click()

  await expect(page).toHaveURL(/\/tasks$/)
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
  // 保存に失敗したときは画面を移らない。
  await expect(page).toHaveURL(/\/tasks\/[0-9a-f-]{36}$/)
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
