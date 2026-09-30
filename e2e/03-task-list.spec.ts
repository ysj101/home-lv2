import { expect, test } from '@playwright/test'

/** 引越しを1件登録してから一覧を見る。 */
test.describe.configure({ mode: 'serial' })

test.beforeAll(async ({ browser }) => {
  const page = await browser.newPage()
  await page.goto('/settings')

  const create = page.getByRole('button', { name: /登録して/ })
  if (await create.isVisible().catch(() => false)) {
    await page.getByLabel('引越し名').fill('Home Lv.2')
    // 期限超過と未来の両方が出るよう、今日より少し先を引越し日にする。
    await page.getByLabel('引越し日').fill('2026-11-15')
    await create.click()
    await expect(
      page.getByRole('heading', { name: '引越しの設定' }),
    ).toBeVisible({ timeout: 15000 })
  }
  await page.close()
})

test('標準 Quest が一覧に並ぶ', async ({ page }) => {
  await page.goto('/tasks')

  await expect(page.getByRole('heading', { name: 'Quests' })).toBeVisible()
  // seed の標準テンプレートは25件。
  await expect(page.getByRole('list', { name: 'Quest 一覧' }).getByRole('listitem')).toHaveCount(25)
  await expect(page.getByText('全 25 件のうち 25 件が残っています。')).toBeVisible()
})

test('各行にタイトル・期限・担当・カテゴリが出る', async ({ page }) => {
  await page.goto('/tasks')

  const row = page.getByRole('list', { name: 'Quest 一覧' }).getByRole('listitem').filter({ hasText: '電気の停止・開始手続き' })

  await expect(row).toContainText('期限 11/8')
  await expect(row).toContainText('未割当')
  await expect(row).toContainText('電気・ガス・水道')
})

test('行をタップすると詳細が開く', async ({ page }) => {
  await page.goto('/tasks')

  await page.getByRole('link', { name: /引越し業者の見積もりを取る/ }).click()

  await expect(page).toHaveURL(/\/tasks\/[0-9a-f-]{36}$/)
  // URL だけでなく、詳細の中身が出ていることまで確かめる。
  await expect(
    page.getByRole('heading', { name: '引越し業者の見積もりを取る' }),
  ).toBeVisible()
  await expect(page.getByRole('list', { name: 'Quest 一覧' })).toHaveCount(0)
})

test('期限超過の Quest が強調される', async ({ page }) => {
  await page.goto('/tasks')

  // 引越し日 2026-11-15 の -60 日 = 2026-09-16。今日より前なら超過表示になる。
  const overdue = page.getByText('（超過）')

  expect(await overdue.count()).toBeGreaterThan(0)
})

test('スマートフォン幅で横スクロールが出ない', async ({ page }) => {
  await page.goto('/tasks')

  const overflows = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  )
  expect(overflows).toBe(false)
})
