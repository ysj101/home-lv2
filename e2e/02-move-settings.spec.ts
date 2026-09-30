import { expect, test } from '@playwright/test'

/**
 * Move の登録・編集。
 *
 * global-setup でローカル D1 を作り直しているので、Move 未登録から始まる。
 * Move は Household ごとに1件なので、登録→編集の順に直列で流す。
 */
test.describe.configure({ mode: 'serial' })

test('未登録のときは Dashboard から Settings へ誘導される', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByText('まだ引越しが登録されていません')).toBeVisible()
  await page.getByRole('link', { name: '引越しを登録する' }).click()

  await expect(page).toHaveURL(/\/settings$/)
  await expect(
    page.getByRole('heading', { name: '引越しを登録する' }),
  ).toBeVisible()
})

test('引越しを登録すると編集フォームに変わる', async ({ page }) => {
  await page.goto('/settings')

  await page.getByLabel('引越し名').fill('Home Lv.2')
  await page.getByLabel('引越し日').fill('2026-11-15')
  await page.getByLabel('旧住所').fill('東京都〇〇区')
  await page.getByLabel('新住所').fill('神奈川県△△市')
  await page.getByRole('button', { name: /登録して/ }).click()

  await expect(
    page.getByRole('heading', { name: '引越しの設定' }),
  ).toBeVisible({ timeout: 15000 })
  await expect(page.getByLabel('引越し名')).toHaveValue('Home Lv.2')
  await expect(page.getByLabel('引越し日')).toHaveValue('2026-11-15')
  await expect(page.getByLabel('旧住所')).toHaveValue('東京都〇〇区')
})

test('登録後は未登録の導線が消える', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByText('まだ引越しが登録されていません')).toHaveCount(0)
})

test('引越し名を編集して保存できる', async ({ page }) => {
  await page.goto('/settings')

  await page.getByLabel('引越し名').fill('Home Lv.2 改')
  await page.getByRole('button', { name: '保存する' }).click()

  await page.reload()
  await expect(page.getByLabel('引越し名')).toHaveValue('Home Lv.2 改')
})

test('引越し名が空ならサーバー側で弾かれる', async ({ page }) => {
  await page.goto('/settings')

  // ブラウザの required を外して、サーバー側の検証が効くことを確かめる。
  await page
    .getByLabel('引越し名')
    .evaluate((el) => el.removeAttribute('required'))
  await page.getByLabel('引越し名').fill('   ')
  await page.getByRole('button', { name: '保存する' }).click()

  await expect(page.getByRole('alert')).toContainText('引越し名を入力してください')
})
