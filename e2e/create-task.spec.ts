import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial' })

const rows = (page: import('@playwright/test').Page) =>
  page.getByRole('list', { name: 'Quest 一覧' }).getByRole('listitem')

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

test('フォームから Quest を追加すると一覧に反映される', async ({ page }) => {
  await page.goto('/tasks')
  const before = await rows(page).count()

  await page.getByRole('button', { name: 'Quest を追加' }).click()
  const dialog = page.getByRole('dialog')

  await dialog.getByLabel('タイトル').fill('ベランダの片付け')
  await dialog.getByLabel('説明').fill('植木鉢をどうするか決める')
  await dialog.getByLabel('期限').fill('2026-11-10')

  await dialog.getByLabel('カテゴリ').click()
  await page.getByRole('option', { name: '荷造り' }).click()

  await dialog.getByLabel('担当').click()
  await page.getByRole('option', { name: 'Adult B' }).click()

  await dialog.getByRole('button', { name: '追加する' }).click()

  await expect(rows(page)).toHaveCount(before + 1)
  const added = rows(page).filter({ hasText: 'ベランダの片付け' })
  await expect(added).toContainText('期限 11/10')
  await expect(added).toContainText('Adult B')
  await expect(added).toContainText('荷造り')
})

test('タイトルが空ならサーバー側で弾かれる', async ({ page }) => {
  await page.goto('/tasks')

  await page.getByRole('button', { name: 'Quest を追加' }).click()
  const dialog = page.getByRole('dialog')

  await dialog
    .getByLabel('タイトル')
    .evaluate((el) => el.removeAttribute('required'))
  await dialog.getByLabel('タイトル').fill('   ')
  await dialog.getByRole('button', { name: '追加する' }).click()

  await expect(page.getByRole('alert')).toContainText(
    'タイトルを入力してください',
  )
})

test('期限なしでも追加できる', async ({ page }) => {
  await page.goto('/tasks')

  await page.getByRole('button', { name: 'Quest を追加' }).click()
  const dialog = page.getByRole('dialog')

  await dialog.getByLabel('タイトル').fill('いつかやる')
  await dialog.getByRole('button', { name: '追加する' }).click()

  await expect(
    rows(page).filter({ hasText: 'いつかやる' }),
  ).toContainText('期限なし')
})
