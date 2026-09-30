import { expect, test } from '@playwright/test'

test('ヘッダーと現在ユーザーが表示される', async ({ page }) => {
  await page.goto('/')

  await expect(page).toHaveTitle('Home Lv.2')
  await expect(page.getByRole('banner')).toContainText('HOME')
  await expect(page.getByRole('banner')).toContainText('Lv.2')
})

test('ボトムナビで3画面を行き来できる', async ({ page }) => {
  await page.goto('/')

  const nav = page.getByRole('navigation')
  await expect(nav.getByRole('link', { name: 'Dashboard' })).toBeVisible()

  await nav.getByRole('link', { name: 'Quests' }).click()
  await expect(page).toHaveURL(/\/tasks$/)

  await nav.getByRole('link', { name: 'Settings' }).click()
  await expect(page).toHaveURL(/\/settings$/)

  await nav.getByRole('link', { name: 'Dashboard' }).click()
  await expect(page).toHaveURL(/\/$/)
})

test('スマートフォン幅で横スクロールが出ない', async ({ page }) => {
  await page.goto('/')

  const overflows = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  )
  expect(overflows).toBe(false)
})
