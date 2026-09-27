import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { householdMembers, moves, tasks, users } from '@/db/schema'
import { createTestDb, type TestDb } from '@/db/test-db'
import type { HouseholdContext } from '@/features/auth/household-context'
import { createTestContext } from '@/features/auth/test-context'
import { completeTask, reopenTask } from '@/features/task/complete-task'

let db: TestDb
let context: HouseholdContext
let partnerContext: HouseholdContext
let taskId: string

beforeEach(async () => {
  db = createTestDb()
  context = await createTestContext(db)

  const [partner] = await db
    .insert(users)
    .values({ id: 'u-partner', email: 'adult-b@example.com', name: 'Adult B' })
    .returning()
  await db
    .insert(householdMembers)
    .values({ householdId: 'h1', userId: partner.id })
  partnerContext = { ...context, user: partner }

  const [move] = await db
    .insert(moves)
    .values({ householdId: 'h1', name: 'Home Lv.2', moveDate: '2026-11-15' })
    .returning()
  const [task] = await db
    .insert(tasks)
    .values({
      moveId: move.id,
      title: '電気の停止',
      category: 'utility',
      dueDate: '2026-11-08',
      source: 'template',
      status: 'todo',
    })
    .returning()
  taskId = task.id
})

afterEach(() => db.close())

describe('completeTask', () => {
  it('完了にして実行ユーザーと時刻を記録する', async () => {
    const completedAt = new Date('2026-11-05T10:00:00Z')

    const task = await completeTask(context, taskId, completedAt)

    expect(task).toMatchObject({
      status: 'completed',
      completedBy: context.user.id,
    })
    expect(task.completedAt?.getTime()).toBe(completedAt.getTime())
  })

  it('completed_by は操作したユーザーになる', async () => {
    const task = await completeTask(partnerContext, taskId)

    expect(task.completedBy).toBe('u-partner')
  })

  it('完了時刻を省略すると現在時刻を入れる', async () => {
    const before = Date.now()

    const task = await completeTask(context, taskId)

    expect(task.completedAt!.getTime()).toBeGreaterThanOrEqual(before - 1000)
  })

  it('他の項目は変わらない', async () => {
    const task = await completeTask(context, taskId)

    expect(task).toMatchObject({
      title: '電気の停止',
      dueDate: '2026-11-08',
      source: 'template',
    })
  })

  it('存在しない Task は 404', async () => {
    await expect(completeTask(context, 'missing')).rejects.toMatchObject({
      status: 404,
    })
  })

  it('他 Household の Task は完了にできない（404）', async () => {
    const other = await createTestContext(db, {
      householdId: 'h2',
      userId: 'u2',
      email: 'other@example.com',
    })
    const [theirMove] = await db
      .insert(moves)
      .values({ householdId: 'h2', name: 'Their Move', moveDate: '2026-12-01' })
      .returning()
    const [theirTask] = await db
      .insert(tasks)
      .values({
        moveId: theirMove.id,
        title: '他人のタスク',
        category: 'other',
        source: 'manual',
        status: 'todo',
      })
      .returning()

    await expect(completeTask(context, theirTask.id)).rejects.toMatchObject({
      status: 404,
    })
    expect(await completeTask(other, theirTask.id)).toMatchObject({
      status: 'completed',
    })
  })
})

describe('reopenTask', () => {
  it('完了情報をクリアして todo に戻す', async () => {
    await completeTask(context, taskId)

    const task = await reopenTask(context, taskId)

    expect(task).toMatchObject({
      status: 'todo',
      completedAt: null,
      completedBy: null,
    })
  })

  it('未完了の Task に実行しても todo のまま', async () => {
    expect(await reopenTask(context, taskId)).toMatchObject({
      status: 'todo',
      completedAt: null,
    })
  })

  it('完了 → 再オープン → 完了で completed_by が更新される', async () => {
    await completeTask(context, taskId)
    await reopenTask(context, taskId)

    expect(await completeTask(partnerContext, taskId)).toMatchObject({
      completedBy: 'u-partner',
    })
  })

  it('他 Household の Task は再オープンできない（404）', async () => {
    const other = await createTestContext(db, {
      householdId: 'h2',
      userId: 'u2',
      email: 'other@example.com',
    })
    const [theirMove] = await db
      .insert(moves)
      .values({ householdId: 'h2', name: 'Their Move', moveDate: '2026-12-01' })
      .returning()
    const [theirTask] = await db
      .insert(tasks)
      .values({
        moveId: theirMove.id,
        title: '他人のタスク',
        category: 'other',
        source: 'manual',
        status: 'completed',
      })
      .returning()
    void other

    await expect(reopenTask(context, theirTask.id)).rejects.toMatchObject({
      status: 404,
    })
  })
})
