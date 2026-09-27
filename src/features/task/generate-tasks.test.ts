import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { taskTemplates, type TaskTemplate } from '@/db/schema'
import { createTestDb, type TestDb } from '@/db/test-db'
import { TASK_TEMPLATE_SEEDS } from '@/db/seed/task-templates'
import type { HouseholdContext } from '@/features/auth/household-context'
import { createTestContext } from '@/features/auth/test-context'
import { createMove } from '@/features/move/create-move'
import {
  buildTasksFromTemplates,
  generateTasksFromTemplates,
} from '@/features/task/generate-tasks'

let db: TestDb
let context: HouseholdContext

const MOVE_DATE = '2026-11-15'

function template(overrides: Partial<TaskTemplate> = {}): TaskTemplate {
  return {
    id: 'tpl',
    title: 'テンプレート',
    description: null,
    category: 'other',
    offsetDays: 0,
    sortOrder: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

beforeEach(async () => {
  db = createTestDb()
  context = await createTestContext(db)
})

afterEach(() => db.close())

describe('buildTasksFromTemplates', () => {
  const move = { id: 'm1', moveDate: MOVE_DATE }

  it('dueDate = moveDate + offsetDays で計算する', () => {
    const [task] = buildTasksFromTemplates(move, [
      template({ offsetDays: -7 }),
    ])

    expect(task.dueDate).toBe('2026-11-08')
  })

  it('引越し後のテンプレートは未来の日付になる', () => {
    const [task] = buildTasksFromTemplates(move, [template({ offsetDays: 14 })])

    expect(task.dueDate).toBe('2026-11-29')
  })

  it('月をまたいでも正しい', () => {
    const [task] = buildTasksFromTemplates(
      { id: 'm1', moveDate: '2026-11-01' },
      [template({ offsetDays: -1 })],
    )

    expect(task.dueDate).toBe('2026-10-31')
  })

  it('source / status / assignee / template_id を設定する', () => {
    const [task] = buildTasksFromTemplates(move, [
      template({ id: 'electricity', category: 'utility' }),
    ])

    expect(task).toMatchObject({
      moveId: 'm1',
      source: 'template',
      status: 'todo',
      assigneeId: null,
      templateId: 'electricity',
      category: 'utility',
    })
  })

  it('sort_order 順に並べる', () => {
    const built = buildTasksFromTemplates(move, [
      template({ id: 'c', title: 'C', sortOrder: 3 }),
      template({ id: 'a', title: 'A', sortOrder: 1 }),
      template({ id: 'b', title: 'B', sortOrder: 2 }),
    ])

    expect(built.map((task) => task.title)).toEqual(['A', 'B', 'C'])
  })

  it('テンプレートが0件なら何も作らない', () => {
    expect(buildTasksFromTemplates(move, [])).toEqual([])
  })
})

describe('generateTasksFromTemplates', () => {
  beforeEach(async () => {
    await db.insert(taskTemplates).values(
      TASK_TEMPLATE_SEEDS.map((seed, index) => ({
        id: seed.id,
        title: seed.title,
        description: seed.description,
        category: seed.category,
        offsetDays: seed.offsetDays,
        sortOrder: index + 1,
      })),
    )
  })

  it('テンプレート件数分の Task を生成する', async () => {
    const move = await createMove(context, {
      name: 'Home Lv.2',
      moveDate: MOVE_DATE,
    })

    const created = await generateTasksFromTemplates(context, move)

    expect(created).toHaveLength(TASK_TEMPLATE_SEEDS.length)
  })

  it('標準テンプレートの期限が正しく計算される', async () => {
    const move = await createMove(context, {
      name: 'Home Lv.2',
      moveDate: MOVE_DATE,
    })

    const created = await generateTasksFromTemplates(context, move)
    const electricity = created.find((task) => task.templateId === 'electricity')

    expect(electricity).toMatchObject({
      dueDate: '2026-11-08',
      source: 'template',
      status: 'todo',
      assigneeId: null,
    })
  })

  it('生成した Task はすべて対象 Move に紐づく', async () => {
    const move = await createMove(context, {
      name: 'Home Lv.2',
      moveDate: MOVE_DATE,
    })

    const created = await generateTasksFromTemplates(context, move)

    expect(created.every((task) => task.moveId === move.id)).toBe(true)
  })
})
