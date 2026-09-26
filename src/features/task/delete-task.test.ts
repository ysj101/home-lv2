import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { moves, tasks } from '@/db/schema'
import { createTestDb, type TestDb } from '@/db/test-db'
import type { HouseholdContext } from '@/features/auth/household-context'
import { createTestContext } from '@/features/auth/test-context'
import { deleteTask } from '@/features/task/delete-task'

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
      title: '消すタスク',
      category: 'other',
      source: 'manual',
      status: 'todo',
    })
    .returning()
  taskId = task.id
})

afterEach(() => db.close())

describe('deleteTask', () => {
  it('Task を削除する', async () => {
    await deleteTask(context, taskId)

    expect(await db.select().from(tasks)).toEqual([])
  })

  it('テンプレート由来の Task も削除できる', async () => {
    const [move] = await db.select().from(moves)
    const [templateTask] = await db
      .insert(tasks)
      .values({
        moveId: move.id,
        title: 'テンプレ由来',
        category: 'utility',
        source: 'template',
        status: 'todo',
      })
      .returning()

    await deleteTask(context, templateTask.id)

    expect(
      (await db.select().from(tasks)).map((task) => task.title),
    ).toEqual(['消すタスク'])
  })

  it('存在しない Task は 404', async () => {
    await expect(deleteTask(context, 'missing')).rejects.toMatchObject({
      status: 404,
    })
  })

  it('同じ Task を2回削除すると2回目は 404', async () => {
    await deleteTask(context, taskId)

    await expect(deleteTask(context, taskId)).rejects.toMatchObject({
      status: 404,
    })
  })

  it('他 Household の Task は削除できない（404）', async () => {
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

    await expect(deleteTask(context, theirTask.id)).rejects.toMatchObject({
      status: 404,
    })
    expect(await db.select().from(tasks)).toHaveLength(2)

    // 持ち主からは消せる。
    await deleteTask(other, theirTask.id)
    expect(await db.select().from(tasks)).toHaveLength(1)
  })
})
