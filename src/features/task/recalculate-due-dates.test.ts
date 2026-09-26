import { eq } from 'drizzle-orm'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { taskTemplates, tasks, type Task } from '@/db/schema'
import { createTestDb, type TestDb } from '@/db/test-db'
import type { HouseholdContext } from '@/features/auth/household-context'
import { createTestContext } from '@/features/auth/test-context'
import { createMove } from '@/features/move/create-move'
import { updateMove } from '@/features/move/update-move'
import {
  computeDueDateChanges,
  previewRecalculation,
  recalculateTemplateTaskDueDates,
} from '@/features/task/recalculate-due-dates'

let db: TestDb
let context: HouseholdContext
let moveId: string

const MOVE_DATE = '2026-11-15'
const NEW_MOVE_DATE = '2026-12-01'

/** 期限が分かりやすいよう、オフセットの違う3件だけ用意する。 */
const TEMPLATES = [
  { id: 'early', title: '見積もり', category: 'moving-company', offsetDays: -30, sortOrder: 1 },
  { id: 'electricity', title: '電気', category: 'utility', offsetDays: -7, sortOrder: 2 },
  { id: 'after', title: '転入届', category: 'administrative', offsetDays: 7, sortOrder: 3 },
] as const

beforeEach(async () => {
  db = createTestDb()
  context = await createTestContext(db)
  await db.insert(taskTemplates).values(
    TEMPLATES.map((template) => ({ ...template, description: null })),
  )
  const created = await createMove(context, {
    name: 'Home Lv.2',
    moveDate: MOVE_DATE,
  })
  moveId = created.move.id
})

afterEach(() => db.close())

async function taskByTemplate(templateId: string): Promise<Task> {
  const rows = await db.select().from(tasks)

  return rows.find((task) => task.templateId === templateId)!
}

describe('computeDueDateChanges', () => {
  it('期限が変わらない Task は返さない', () => {
    const changes = computeDueDateChanges(
      [
        { id: 't1', title: 'A', dueDate: '2026-11-08', offsetDays: -7 },
        { id: 't2', title: 'B', dueDate: '2026-11-01', offsetDays: -14 },
      ],
      '2026-11-15',
    )

    expect(changes).toEqual([])
  })

  it('期限が変わるものを新旧セットで返す', () => {
    expect(
      computeDueDateChanges(
        [{ id: 't1', title: 'A', dueDate: '2026-11-08', offsetDays: -7 }],
        NEW_MOVE_DATE,
      ),
    ).toEqual([
      {
        taskId: 't1',
        title: 'A',
        currentDueDate: '2026-11-08',
        nextDueDate: '2026-11-24',
      },
    ])
  })
})

describe('previewRecalculation', () => {
  it('対象 Task の新旧の期限を返し、DB は更新しない', async () => {
    const changes = await previewRecalculation(context, moveId, NEW_MOVE_DATE)

    expect(changes).toHaveLength(3)
    expect(changes).toContainEqual(
      expect.objectContaining({
        title: '電気',
        currentDueDate: '2026-11-08',
        nextDueDate: '2026-11-24',
      }),
    )
    expect((await taskByTemplate('electricity')).dueDate).toBe('2026-11-08')
  })

  it('手動追加の Task は対象外', async () => {
    await db.insert(tasks).values({
      moveId,
      title: '手動タスク',
      category: 'other',
      dueDate: '2026-11-10',
      source: 'manual',
      status: 'todo',
    })

    const changes = await previewRecalculation(context, moveId, NEW_MOVE_DATE)

    expect(changes.map((change) => change.title)).not.toContain('手動タスク')
  })

  it('完了済みの Task は対象外', async () => {
    const electricity = await taskByTemplate('electricity')
    await db
      .update(tasks)
      .set({ status: 'completed' })
      .where(eq(tasks.id, electricity.id))

    const changes = await previewRecalculation(context, moveId, NEW_MOVE_DATE)

    expect(changes.map((change) => change.title)).not.toContain('電気')
    expect(changes).toHaveLength(2)
  })

  it('引越し日が変わらなければ空', async () => {
    expect(await previewRecalculation(context, moveId, MOVE_DATE)).toEqual([])
  })

  it('他 Household の Move は 404', async () => {
    const other = await createTestContext(db, {
      householdId: 'h2',
      userId: 'u2',
      email: 'other@example.com',
    })

    await expect(
      previewRecalculation(other, moveId, NEW_MOVE_DATE),
    ).rejects.toMatchObject({ status: 404 })
  })
})

describe('recalculateTemplateTaskDueDates', () => {
  it('引越し日変更後にテンプレート由来の未完了 Task だけ期限が更新される', async () => {
    await db.insert(tasks).values({
      moveId,
      title: '手動タスク',
      category: 'other',
      dueDate: '2026-11-10',
      source: 'manual',
      status: 'todo',
    })
    const completed = await taskByTemplate('after')
    await db.update(tasks).set({ status: 'completed' }).where(eq(tasks.id, completed.id))

    await updateMove(context, moveId, { moveDate: NEW_MOVE_DATE })
    const updated = await recalculateTemplateTaskDueDates(context, moveId)

    expect(updated).toHaveLength(2)
    expect((await taskByTemplate('early')).dueDate).toBe('2026-11-01')
    expect((await taskByTemplate('electricity')).dueDate).toBe('2026-11-24')
    // 完了済みと手動は据え置き。
    expect((await taskByTemplate('after')).dueDate).toBe('2026-11-22')
    const manual = (await db.select().from(tasks)).find(
      (task) => task.source === 'manual',
    )
    expect(manual?.dueDate).toBe('2026-11-10')
  })

  it('引越し日が変わっていなければ何も更新しない', async () => {
    expect(await recalculateTemplateTaskDueDates(context, moveId)).toEqual([])
  })

  it('他 Household からは実行できない（404）', async () => {
    const other = await createTestContext(db, {
      householdId: 'h2',
      userId: 'u2',
      email: 'other@example.com',
    })

    await expect(
      recalculateTemplateTaskDueDates(other, moveId),
    ).rejects.toMatchObject({ status: 404 })
  })
})
