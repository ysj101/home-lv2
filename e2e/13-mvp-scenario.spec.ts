import { expect, test as base, type Page } from '@playwright/test'

import { TASK_TEMPLATE_SEEDS } from '@/db/seed/task-templates'
import { addDays, daysBetween, toMonthDay, today } from '@/lib/date'

import { resetDatabase } from './database'
import { questRows, sectionRows, visit } from './helpers'
import { ADULT_A, ADULT_B, asUser } from './users'

/**
 * MVP の通しシナリオ（docs/spec.md §26 Acceptance Criteria）。
 *
 * 引越し登録 → 標準 Quest 生成 → Quest 追加 → 担当設定 → 完了 →
 * Dashboard に反映 → 引越し日変更 → 期限再計算 を、Adult A / B の2人で進める。
 * `page` が Adult A、`partner` が Adult B。
 *
 * モバイル幅のプロジェクトでも流すので、毎回 DB を初期状態に戻してから始める。
 */
const test = base.extend<{ partner: Page }>({
  // Adult B は別のブラウザコンテキストで操作する。viewport などはプロジェクトの設定を引き継ぐ。
  partner: async ({ browser }, use) => {
    const context = await browser.newContext({
      extraHTTPHeaders: asUser(ADULT_B),
    })
    await use(await context.newPage())
    await context.close()
  },
})

// 再試行や --repeat-each でも同じ状態から始められるよう、テストごとに戻す。
test.beforeEach(() => {
  resetDatabase()
})

// アプリと同じ基準（JST）の今日。期限超過・今日・今週の境界はここから決まる。
const TODAY = today()
// 期限超過・今日・今週・先の予定がそれぞれ出るよう、引越し日は30日後にする。
const MOVE_DATE = addDays(TODAY, 30)
const NEW_MOVE_DATE = addDays(MOVE_DATE, 7)

const TEMPLATE = TASK_TEMPLATE_SEEDS.find(
  (template) => template.title === '電気の停止・開始手続き',
)!

/** 手動で追加する Quest。期限は今週やることに入る3日後。 */
const QUEST = {
  title: '新居の Wi-Fi を設定する',
  dueDate: addDays(TODAY, 3),
}

/** その引越し日のとき、今日の時点で期限を過ぎている標準 Quest の件数。 */
function overdueTemplates(moveDate: string): number {
  return TASK_TEMPLATE_SEEDS.filter(
    (template) => addDays(moveDate, template.offsetDays) < TODAY,
  ).length
}

/** Dashboard 上部の件数（Cleared / Remaining / Overdue）の数字。 */
function summaryCount(page: Page, label: string) {
  return page
    .getByRole('listitem')
    .filter({ has: page.getByText(label, { exact: true }) })
    .locator('p')
    .first()
}

/** 引越し日を変えて保存する。 */
async function changeMoveDate(page: Page, date: string) {
  await visit(page, '/settings')
  await page.getByLabel('引越し日').fill(date)
  await Promise.all([
    page.waitForResponse((response) => response.request().method() === 'POST'),
    page.getByRole('button', { name: '保存する' }).click(),
  ])
}

test('引越し登録から期限の再計算までを2人で進められる', async ({
  page,
  partner,
}) => {
  test.slow()

  await test.step('Adult A が引越しを登録する', async () => {
    await visit(page, '/')
    await expect(page.getByRole('banner')).toContainText(ADULT_A.name)
    await expect(page.getByText('まだ引越しが登録されていません')).toBeVisible()

    await visit(page, '/settings')
    await page.getByLabel('引越し名').fill('E2E の引越し')
    await page.getByLabel('引越し日').fill(MOVE_DATE)
    await page.getByRole('button', { name: /登録して/ }).click()

    await expect(
      page.getByRole('heading', { name: '引越しの設定' }),
    ).toBeVisible({ timeout: 15000 })
  })

  await test.step('標準 Quest が引越し日を基準に生成される', async () => {
    await visit(page, '/tasks')

    await expect(questRows(page)).toHaveCount(TASK_TEMPLATE_SEEDS.length)
    await expect(
      questRows(page).filter({ hasText: TEMPLATE.title }),
    ).toContainText(
      `期限 ${toMonthDay(addDays(MOVE_DATE, TEMPLATE.offsetDays))}`,
    )
  })

  await test.step('Adult B にも同じ Quest が見える', async () => {
    await visit(partner, '/tasks')

    await expect(partner.getByRole('banner')).toContainText(ADULT_B.name)
    await expect(questRows(partner)).toHaveCount(TASK_TEMPLATE_SEEDS.length)
  })

  await test.step('Adult A が Quest を追加する', async () => {
    await visit(page, '/tasks')
    await page.getByRole('button', { name: 'Quest を追加' }).click()

    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('タイトル').fill(QUEST.title)
    await dialog.getByLabel('期限').fill(QUEST.dueDate)
    await dialog.getByLabel('カテゴリ').click()
    await page.getByRole('option', { name: '住まい' }).click()
    await dialog.getByRole('button', { name: '追加する' }).click()

    await expect(questRows(page)).toHaveCount(TASK_TEMPLATE_SEEDS.length + 1)
    await expect(questRows(page).filter({ hasText: QUEST.title })).toContainText(
      '未割当',
    )
  })

  await test.step('Adult A が担当を Adult B にする', async () => {
    await page
      .getByRole('link', { name: new RegExp(QUEST.title) })
      .first()
      .click()
    await expect(page.getByRole('heading', { name: QUEST.title })).toBeVisible()

    await page.getByLabel('担当').click()
    await page.getByRole('option', { name: ADULT_B.name }).click()

    await expect(page.getByLabel('担当')).toContainText(ADULT_B.name, {
      timeout: 10000,
    })
  })

  await test.step('Dashboard の今週やることに出る', async () => {
    await visit(page, '/')

    await expect(
      sectionRows(page, '今週やること').filter({ hasText: QUEST.title }),
    ).toContainText(ADULT_B.name)
  })

  await test.step('Adult B が自分の担当として見つけて完了にする', async () => {
    // Adult B から見ると、自分が担当の Quest になっている。
    await visit(partner, '/tasks?assignee=me')
    const row = questRows(partner).filter({ hasText: QUEST.title })
    await expect(questRows(partner)).toHaveCount(1)

    // サーバー往復のあとに状態が変わるので check() ではなく click() + 待機。
    await row.getByRole('checkbox').click()

    await expect(row.getByRole('checkbox')).toBeChecked({ timeout: 10000 })
    await expect(row).toContainText(`Cleared by ${ADULT_B.name}`)
  })

  await test.step('Adult A の Dashboard に完了が反映される', async () => {
    await visit(page, '/')

    const total = TASK_TEMPLATE_SEEDS.length + 1
    const percent = Math.round((1 / total) * 100)

    await expect(page.getByRole('progressbar')).toHaveAttribute(
      'aria-valuenow',
      String(percent),
    )
    await expect(summaryCount(page, 'Cleared')).toHaveText('1')
    await expect(summaryCount(page, 'Remaining')).toHaveText(String(total - 1))
    await expect(summaryCount(page, 'Overdue')).toHaveText(
      String(overdueTemplates(MOVE_DATE)),
    )

    await expect(
      sectionRows(page, '今週やること').filter({ hasText: QUEST.title }),
    ).toHaveCount(0)
    await expect(
      sectionRows(page, '最近完了した Quest').filter({ hasText: QUEST.title }),
    ).toContainText(`Cleared by ${ADULT_B.name}`)
  })

  await test.step('Adult A が引越し日を1週間遅らせ、期限も更新する', async () => {
    await changeMoveDate(page, NEW_MOVE_DATE)

    // 完了済みと手動追加の Quest は対象外なので、標準 Quest だけが並ぶ。
    const changes = page
      .getByRole('dialog')
      .getByRole('list', { name: '期限が変わる Quest' })
      .getByRole('listitem')
    await expect(changes).toHaveCount(TASK_TEMPLATE_SEEDS.length)
    await expect(changes.filter({ hasText: QUEST.title })).toHaveCount(0)
    await expect(changes.filter({ hasText: TEMPLATE.title })).toContainText(
      `${toMonthDay(addDays(MOVE_DATE, TEMPLATE.offsetDays))} → ${toMonthDay(
        addDays(NEW_MOVE_DATE, TEMPLATE.offsetDays),
      )}`,
    )

    await page.getByRole('button', { name: '期限も更新する' }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
  })

  await test.step('Adult B から見ても期限と残り日数が更新されている', async () => {
    await visit(partner, '/tasks')

    await expect(
      questRows(partner).filter({ hasText: TEMPLATE.title }),
    ).toContainText(
      `期限 ${toMonthDay(addDays(NEW_MOVE_DATE, TEMPLATE.offsetDays))}`,
    )

    // 手動で追加した Quest の期限はそのまま。
    await partner
      .getByRole('link', { name: new RegExp(QUEST.title) })
      .first()
      .click()
    await expect(partner.getByLabel('期限')).toHaveValue(QUEST.dueDate)
    await expect(partner.getByText(`${ADULT_B.name} が完了`)).toBeVisible()

    await visit(partner, '/')
    await expect(
      partner.getByText(`あと ${daysBetween(TODAY, NEW_MOVE_DATE)} 日`),
    ).toBeVisible()
    await expect(partner.getByText(NEW_MOVE_DATE)).toBeVisible()
    await expect(summaryCount(partner, 'Overdue')).toHaveText(
      String(overdueTemplates(NEW_MOVE_DATE)),
    )
  })
})
