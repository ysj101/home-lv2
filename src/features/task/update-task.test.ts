import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { moves, tasks } from '@/db/schema'
import { createTestDb, type TestDb } from '@/db/test-db'
import type { HouseholdContext } from '@/features/auth/household-context'
import { createTestContext } from '@/features/auth/test-context'
import { updateTask } from '@/features/task/update-task'

let db: TestDb
let context: HouseholdContext
let taskId: string

beforeEach(async () => {
  db = createTestDb()
  context = await createTestContext(db)
  const [move] = await db
    .insert(moves)
    .values({ householdId: 'h1', name: 'Home Lv.2', moveDate: '2026-11-15' })
    .returning()
  const [task] = await db
    .insert(tasks)
    .values({
      moveId: move.id,
      title: '元のタイトル',
      description: '元の説明',
      category: 'packing',
      dueDate: '2026-11-10',
      source: 'manual',
      status: 'todo',
    })
    .returning()
  taskId = task.id
})

afterEach(() => db.close())

/** 別 Household に Task を1件作り、その id を返す。 */
async function otherHouseholdTask() {
  const other = await createTestContext(db, {
    householdId: 'h2',
    userId: 'u2',
    email: 'other@example.com',
  })
  const [move] = await db
    .insert(moves)
    .values({ householdId: 'h2', name: 'Their Move', moveDate: '2026-12-01' })
    .returning()
  const [task] = await db
    .insert(tasks)
    .values({
      moveId: move.id,
      title: '他人のタスク',
      category: 'other',
      source: 'manual',
      status: 'todo',
    })
    .returning()

  return { other, taskId: task.id }
}

describe('updateTask', () => {
  it('渡した項目だけを更新する', async () => {
    const updated = await updateTask(context, taskId, { title: '新しい' })

    expect(updated).toMatchObject({
      title: '新しい',
      description: '元の説明',
      category: 'packing',
      dueDate: '2026-11-10',
    })
  })

  it('説明・カテゴリ・期限を更新できる', async () => {
    const updated = await updateTask(context, taskId, {
      description: '新しい説明',
      category: 'utility',
      dueDate: '2026-11-20',
    })

    expect(updated).toMatchObject({
      description: '新しい説明',
      category: 'utility',
      dueDate: '2026-11-20',
    })
  })

  it('期限を null にできる', async () => {
    expect(await updateTask(context, taskId, { dueDate: null })).toMatchObject({
      dueDate: null,
    })
  })

  it('説明の空文字は null に寄せる', async () => {
    expect(
      await updateTask(context, taskId, { description: '   ' }),
    ).toMatchObject({ description: null })
  })

  it('updated_at が進む', async () => {
    const [before] = await db.select().from(tasks)

    const updated = await updateTask(context, taskId, { title: '新しい' })

    expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(
      before.updatedAt.getTime(),
    )
  })

  it('タイトルが空なら 400', async () => {
    await expect(
      updateTask(context, taskId, { title: '  ' }),
    ).rejects.toMatchObject({ status: 400 })
  })

  it('不明なカテゴリは 400', async () => {
    await expect(
      updateTask(context, taskId, { category: 'travel' as never }),
    ).rejects.toMatchObject({ status: 400 })
  })

  it('不正な期限は 400', async () => {
    await expect(
      updateTask(context, taskId, { dueDate: '2026-02-30' }),
    ).rejects.toMatchObject({ status: 400 })
  })

  it('担当者と完了状態には触らない', async () => {
    const updated = await updateTask(context, taskId, { title: '新しい' })

    expect(updated).toMatchObject({
      assigneeId: null,
      status: 'todo',
      completedAt: null,
      completedBy: null,
    })
  })

  it('存在しない Task は 404', async () => {
    await expect(
      updateTask(context, 'missing', { title: 'x' }),
    ).rejects.toMatchObject({ status: 404 })
  })

  it('他 Household の Task は更新できない（404）', async () => {
    const { taskId: theirTaskId } = await otherHouseholdTask()

    await expect(
      updateTask(context, theirTaskId, { title: 'Hijacked' }),
    ).rejects.toMatchObject({ status: 404 })

    const rows = await db.select().from(tasks)
    expect(rows.find((task) => task.id === theirTaskId)?.title).toBe(
      '他人のタスク',
    )
  })
})
