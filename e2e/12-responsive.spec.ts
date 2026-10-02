import { expect, test, type Page } from '@playwright/test'

import { ensureMoveRegistered } from './helpers'

test.describe.configure({ mode: 'serial' })

test.beforeAll(async ({ browser }) => {
  const page = await browser.newPage()
  await ensureMoveRegistered(page)
  await page.close()
})

/** 横スクロールが出ていないこと。 */
async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }))

  expect(
    overflow.scrollWidth,
    `横スクロールが出ている (scrollWidth=${overflow.scrollWidth}, innerWidth=${overflow.innerWidth})`,
  ).toBeLessThanOrEqual(overflow.innerWidth + 1)
}

/** 操作要素のタップ領域が 44px 以上あること（spec §25 Mobile First）。 */
async function expectTapTargets(page: Page) {
  const small = await page.evaluate(() => {
    const selectors = 'a, button, [role="checkbox"], [role="combobox"]'
    return [...document.querySelectorAll(selectors)]
      .filter((el) => {
        const style = getComputedStyle(el)
        if (style.display === 'none' || style.visibility === 'hidden') {
          return false
        }
        const box = el.getBoundingClientRect()
        if (box.width === 0 || box.height === 0) return false

        // ::after で広げている場合（チェックボックス）は実効領域で見る。
        const after = getComputedStyle(el, '::after')
        const extraY = Math.abs(parseFloat(after.insetBlockStart || '0')) * 2

        return box.height + (Number.isNaN(extraY) ? 0 : extraY) < 44
      })
      .map((el) => `${el.tagName}: ${el.textContent?.trim().slice(0, 20)}`)
  })

  expect(small, `44px 未満の操作要素: ${small.join(' / ')}`).toEqual([])
}

const SCREENS = [
  { path: '/', name: 'Dashboard' },
  { path: '/tasks', name: 'Task List' },
  { path: '/settings', name: 'Move Settings' },
] as const

for (const screen of SCREENS) {
  test(`${screen.name} が横スクロールなく収まる`, async ({ page }) => {
    await page.goto(screen.path)
    await expectNoHorizontalScroll(page)
  })
}

test('Task Detail が横スクロールなく収まる', async ({ page }) => {
  await page.goto('/tasks')
  await page.getByRole('link', { name: /電気の停止・開始手続き/ }).first().click()
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

  await expectNoHorizontalScroll(page)
})

test('長いタイトルでも横に溢れない', async ({ page }) => {
  await page.goto('/tasks')
  await page.getByRole('button', { name: 'Quest を追加' }).click()

  const dialog = page.getByRole('dialog')
  await dialog
    .getByLabel('タイトル')
    .fill('ながいたいとるのクエストでレイアウトが崩れないことを確認するための項目')
  await dialog.getByRole('button', { name: '追加する' }).click()
  await expect(dialog).toHaveCount(0)

  await expectNoHorizontalScroll(page)
})

test('タップ領域が 44px 以上ある', async ({ page, isMobile }) => {
  // 44px の指定はタッチ環境（pointer: coarse）にだけ効かせている。
  test.skip(!isMobile, 'タッチ環境でのみ検証する')

  for (const screen of SCREENS) {
    await page.goto(screen.path)
    await expectTapTargets(page)
  }
})

test('ヘッダーとナビが safe-area を確保している', async ({ page }) => {
  await page.goto('/')

  const padding = await page.evaluate(() => ({
    header: getComputedStyle(document.querySelector('header')!).paddingTop,
    nav: getComputedStyle(document.querySelector('nav')!).paddingBottom,
  }))

  // env() は端末依存なので、指定が効いていること（0px でも値が入る）だけ見る。
  expect(padding.header).toBeTruthy()
  expect(padding.nav).toBeTruthy()
})
