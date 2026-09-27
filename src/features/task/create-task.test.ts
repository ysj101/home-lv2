import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { householdMembers, moves, users } from '@/db/schema'
import { createTestDb, type TestDb } from '@/db/test-db'
import type { HouseholdContext } from '@/features/auth/household-context'
import { createTestContext } from '@/features/auth/test-context'
import { createTask } from '@/features/task/create-task'

let db: TestDb
let context: HouseholdContext
let partnerId: string

const input = {
  title: '新しいタスク',
  category: 'packing' as const,
  dueDate: '2026-11-10',
}

beforeEach(async () => {
  db = createTestDb()
  context = await createTestContext(db)

  const [partner] = await db
    .insert(users)
    .values({ id: 'u-partner', email: 'adult-b@example.com', name: 'Adult B' })
    .returning()
  partnerId = partner.id
  await db
    .insert(householdMembers)
    .values({ householdId: 'h1', userId: partnerId })

  await db
    .insert(moves)
    .values({ householdId: 'h1', name: 'Home Lv.2', moveDate: '2026-11-15' })
})

afterEach(() => db.close())

describe('createTask', () => {
  it('source = manual / status = todo で作成する', async () => {
    const task = await createTask(context, input)

    expect(task).toMatchObject({
      title: '新しいタスク',
      category: 'packing',
      dueDate: '2026-11-10',
      source: 'manual',
      status: 'todo',
      assigneeId: null,
      templateId: null,
    })
  })

  it('同じ Household のメンバーを担当者にできる', async () => {
    const task = await createTask(context, { ...input, assigneeId: partnerId })

    expect(task.assigneeId).toBe(partnerId)
  })

  it('Household 外の User は担当者にできない（400）', async () => {
    await db
      .insert(users)
      .values({ id: 'outsider', email: 'out@example.com', name: 'Outsider' })

    await expect(
      createTask(context, { ...input, assigneeId: 'outsider' }),
    ).rejects.toMatchObject({ status: 400 })
  })

  it('存在しない User は担当者にできない（400）', async () => {
    await expect(
      createTask(context, { ...input, assigneeId: 'missing' }),
    ).rejects.toMatchObject({ status: 400 })
  })

  it('不正な category は 400', async () => {
    await expect(
      createTask(context, { ...input, category: 'travel' as never }),
    ).rejects.toMatchObject({ status: 400 })
  })

  it('タイトルが空なら 400', async () => {
    await expect(
      createTask(context, { ...input, title: '   ' }),
    ).rejects.toMatchObject({ status: 400 })
  })

  it('不正な期限は 400', async () => {
    await expect(
      createTask(context, { ...input, dueDate: '2026-02-30' }),
    ).rejects.toMatchObject({ status: 400 })
  })

  it('期限は任意（未指定なら null）', async () => {
    const task = await createTask(context, {
      title: 'いつかやる',
      category: 'other',
    })

    expect(task.dueDate).toBeNull()
  })

  it('説明の空文字は null に寄せる', async () => {
    const task = await createTask(context, { ...input, description: '  ' })

    expect(task.description).toBeNull()
  })

  it('現在 Household の Move に紐づく', async () => {
    const [move] = await db.select().from(moves)

    expect((await createTask(context, input)).moveId).toBe(move.id)
  })

  it('引越し未登録なら 404', async () => {
    const other = await createTestContext(db, {
      householdId: 'h2',
      userId: 'u2',
      email: 'other@example.com',
    })

    await expect(createTask(other, input)).rejects.toMatchObject({
      status: 404,
    })
  })
})
