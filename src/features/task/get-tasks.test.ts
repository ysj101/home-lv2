import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { moves, tasks, users } from '@/db/schema'
import { createTestDb, type TestDb } from '@/db/test-db'
import type { HouseholdContext } from '@/features/auth/household-context'
import { createTestContext } from '@/features/auth/test-context'
import { getTasks, type TaskListItem } from '@/features/task/get-tasks'

let db: TestDb
let context: HouseholdContext
let partnerId: string
let moveId: string

const TODAY = '2026-11-01'

beforeEach(async () => {
  db = createTestDb()
  context = await createTestContext(db)

  // 同じ Household のもう1人（相手）。
  const [partner] = await db
    .insert(users)
    .values({ id: 'u-partner', email: 'adult-b@example.com', name: 'Adult B' })
    .returning()
  partnerId = partner.id

  const [move] = await db
    .insert(moves)
    .values({ householdId: 'h1', name: 'Home Lv.2', moveDate: '2026-11-15' })
    .returning()
  moveId = move.id

  await db.insert(tasks).values([
    { moveId, title: '期限超過', category: 'other', dueDate: '2026-10-20', source: 'template', status: 'todo' },
    { moveId, title: '今日', category: 'utility', dueDate: TODAY, source: 'template', status: 'todo', assigneeId: context.user.id },
    { moveId, title: '来週', category: 'packing', dueDate: '2026-11-08', source: 'manual', status: 'todo', assigneeId: partnerId },
    { moveId, title: '完了済み', category: 'other', dueDate: '2026-10-25', source: 'template', status: 'completed', completedBy: partnerId },
    { moveId, title: '期限なし', category: 'other', dueDate: null, source: 'manual', status: 'todo' },
  ])
})

afterEach(() => db.close())

const titles = (list: TaskListItem[]) => list.map((task) => task.title)

describe('getTasks', () => {
  it('期限昇順に返し、期限なしは末尾に置く', async () => {
    expect(titles(await getTasks(context, { today: TODAY }))).toEqual([
      '期限超過',
      '完了済み',
      '今日',
      '来週',
      '期限なし',
    ])
  })

  it('status: todo は未完了だけ', async () => {
    expect(
      titles(await getTasks(context, { today: TODAY, status: 'todo' })),
    ).toEqual(['期限超過', '今日', '来週', '期限なし'])
  })

  it('status: completed は完了だけ', async () => {
    expect(
      titles(await getTasks(context, { today: TODAY, status: 'completed' })),
    ).toEqual(['完了済み'])
  })

  it('status: overdue は due_date < today かつ未完了だけ', async () => {
    expect(
      titles(await getTasks(context, { today: TODAY, status: 'overdue' })),
    ).toEqual(['期限超過'])
  })

  it('overdue は当日を含まない', async () => {
    const overdue = await getTasks(context, { today: TODAY, status: 'overdue' })

    expect(titles(overdue)).not.toContain('今日')
  })

  it('assignee: me は自分の担当だけ', async () => {
    expect(
      titles(await getTasks(context, { today: TODAY, assignee: 'me' })),
    ).toEqual(['今日'])
  })

  it('assignee: partner は自分以外が担当しているものだけ（未割当は含まない）', async () => {
    expect(
      titles(await getTasks(context, { today: TODAY, assignee: 'partner' })),
    ).toEqual(['来週'])
  })

  it('assignee: unassigned は未割当だけ', async () => {
    expect(
      titles(await getTasks(context, { today: TODAY, assignee: 'unassigned' })),
    ).toEqual(['期限超過', '完了済み', '期限なし'])
  })

  it('category で絞り込める', async () => {
    expect(
      titles(await getTasks(context, { today: TODAY, category: 'utility' })),
    ).toEqual(['今日'])
  })

  it('フィルターを組み合わせられる', async () => {
    expect(
      titles(
        await getTasks(context, {
          today: TODAY,
          status: 'todo',
          assignee: 'unassigned',
          category: 'other',
        }),
      ),
    ).toEqual(['期限超過', '期限なし'])
  })

  it('担当者名と完了者名を含める', async () => {
    const list = await getTasks(context, { today: TODAY })

    expect(list.find((task) => task.title === '今日')).toMatchObject({
      assigneeName: 'Adult A',
      completedByName: null,
    })
    expect(list.find((task) => task.title === '完了済み')).toMatchObject({
      assigneeName: null,
      completedByName: 'Adult B',
    })
  })

  it('不明なカテゴリは 400', async () => {
    await expect(
      getTasks(context, { today: TODAY, category: 'travel' as never }),
    ).rejects.toMatchObject({ status: 400 })
  })

  it('他 Household の Task は返らない', async () => {
    const other = await createTestContext(db, {
      householdId: 'h2',
      userId: 'u2',
      email: 'other@example.com',
    })
    const [otherMove] = await db
      .insert(moves)
      .values({ householdId: 'h2', name: 'Their Move', moveDate: '2026-12-01' })
      .returning()
    await db.insert(tasks).values({
      moveId: otherMove.id,
      title: '他人のタスク',
      category: 'other',
      source: 'manual',
      status: 'todo',
    })

    expect(titles(await getTasks(context, { today: TODAY }))).not.toContain(
      '他人のタスク',
    )
    expect(titles(await getTasks(other, { today: TODAY }))).toEqual([
      '他人のタスク',
    ])
  })
})
