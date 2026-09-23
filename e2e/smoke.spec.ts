import { expect, test } from '@playwright/test'

test('トップページが表示される', async ({ page }) => {
  await page.goto('/')

  await expect(page).toHaveTitle('Home Lv.2')
  await expect(page.getByText('Home Lv.2')).toBeVisible()
  await expect(page.getByRole('button', { name: 'はじめる' })).toBeVisible()
})
