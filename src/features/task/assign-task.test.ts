import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { householdMembers, moves, tasks, users } from '@/db/schema'
import { createTestDb, type TestDb } from '@/db/test-db'
import type { HouseholdContext } from '@/features/auth/household-context'
import { createTestContext } from '@/features/auth/test-context'
import { getHouseholdMembers } from '@/features/auth/get-household-members'
import { assignTask } from '@/features/task/assign-task'

let db: TestDb
let context: HouseholdContext
let taskId: string

beforeEach(async () => {
  db = createTestDb()
  context = await createTestContext(db)

  await db
    .insert(users)
    .values({ id: 'u-partner', email: 'adult-b@example.com', name: 'Adult B' })
  await db
    .insert(householdMembers)
    .values({ householdId: 'h1', userId: 'u-partner' })

  const [move] = await db
    .insert(moves)
    .values({ householdId: 'h1', name: 'Home Lv.2', moveDate: '2026-11-15' })
    .returning()
  const [task] = await db
    .insert(tasks)
    .values({
      moveId: move.id,
      title: '荷造り',
      category: 'packing',
      source: 'manual',
      status: 'todo',
    })
    .returning()
  taskId = task.id
})

afterEach(() => db.close())

describe('assignTask', () => {
  it('自分を担当者にできる', async () => {
    expect(await assignTask(context, taskId, context.user.id)).toMatchObject({
      assigneeId: 'u1',
    })
  })

  it('同じ Household の相手を担当者にできる', async () => {
    expect(await assignTask(context, taskId, 'u-partner')).toMatchObject({
      assigneeId: 'u-partner',
    })
  })

  it('null で未割当に戻せる', async () => {
    await assignTask(context, taskId, 'u-partner')

    expect(await assignTask(context, taskId, null)).toMatchObject({
      assigneeId: null,
    })
  })

  it('担当者を付け替えられる', async () => {
    await assignTask(context, taskId, context.user.id)

    expect(await assignTask(context, taskId, 'u-partner')).toMatchObject({
      assigneeId: 'u-partner',
    })
  })

  it('Household 外の User は指定できない（400）', async () => {
    await db
      .insert(users)
      .values({ id: 'outsider', email: 'out@example.com', name: 'Outsider' })

    await expect(
      assignTask(context, taskId, 'outsider'),
    ).rejects.toMatchObject({ status: 400 })
  })

  it('存在しない User は指定できない（400）', async () => {
    await expect(assignTask(context, taskId, 'missing')).rejects.toMatchObject({
      status: 400,
    })
  })

  it('担当変更で他の項目は変わらない', async () => {
    const task = await assignTask(context, taskId, 'u-partner')

    expect(task).toMatchObject({
      title: '荷造り',
      status: 'todo',
      category: 'packing',
    })
  })

  it('存在しない Task は 404', async () => {
    await expect(assignTask(context, 'missing', null)).rejects.toMatchObject({
      status: 404,
    })
  })

  it('他 Household の Task は担当者を変えられない（404）', async () => {
    await createTestContext(db, {
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

    await expect(
      assignTask(context, theirTask.id, context.user.id),
    ).rejects.toMatchObject({ status: 404 })
  })
})

describe('getHouseholdMembers', () => {
  it('同じ Household のメンバーだけを返す', async () => {
    await createTestContext(db, {
      householdId: 'h2',
      userId: 'u2',
      email: 'other@example.com',
      userName: 'Other',
    })

    const members = await getHouseholdMembers(context)

    expect(members.map((member) => member.id).sort()).toEqual([
      'u-partner',
      'u1',
    ])
    expect(members.map((member) => member.name)).toContain('Adult A')
  })
})
