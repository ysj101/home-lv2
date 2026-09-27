import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { moves, taskTemplates, tasks } from '@/db/schema'
import { TASK_TEMPLATE_SEEDS } from '@/db/seed/task-templates'
import { createTestDb, type TestDb } from '@/db/test-db'
import type { HouseholdContext } from '@/features/auth/household-context'
import { createTestContext } from '@/features/auth/test-context'
import { createMove } from '@/features/move/create-move'

let db: TestDb
let context: HouseholdContext

const input = { name: 'Home Lv.2', moveDate: '2026-11-15' }

beforeEach(async () => {
  db = createTestDb()
  context = await createTestContext(db)
})

afterEach(() => {
  vi.restoreAllMocks()
  db.close()
})

async function seedTemplates(count = TASK_TEMPLATE_SEEDS.length) {
  await db.insert(taskTemplates).values(
    TASK_TEMPLATE_SEEDS.slice(0, count).map((seed, index) => ({
      id: seed.id,
      title: seed.title,
      description: seed.description,
      category: seed.category,
      offsetDays: seed.offsetDays,
      sortOrder: index + 1,
    })),
  )
}

describe('createMove（標準 TODO の自動生成込み）', () => {
  it('Move 登録と同時にテンプレート件数分の Task が並ぶ', async () => {
    await seedTemplates()

    const { move, tasks: created } = await createMove(context, input)

    expect(created).toHaveLength(TASK_TEMPLATE_SEEDS.length)
    expect(await db.select().from(tasks)).toHaveLength(
      TASK_TEMPLATE_SEEDS.length,
    )
    expect(created.every((task) => task.moveId === move.id)).toBe(true)
  })

  it('生成された Task の期限が引越し日基準で計算される', async () => {
    await seedTemplates()

    const { tasks: created } = await createMove(context, input)
    const electricity = created.find((task) => task.templateId === 'electricity')

    expect(electricity).toMatchObject({
      dueDate: '2026-11-08',
      source: 'template',
      status: 'todo',
      assigneeId: null,
    })
  })

  it('sort_order 順に生成される', async () => {
    await seedTemplates(5)

    const { tasks: created } = await createMove(context, input)

    expect(created.map((task) => task.templateId)).toEqual(
      TASK_TEMPLATE_SEEDS.slice(0, 5).map((seed) => seed.id),
    )
  })

  it('テンプレートが0件でも Move は作成できる', async () => {
    const { move, tasks: created } = await createMove(context, input)

    expect(move).toMatchObject({ name: 'Home Lv.2' })
    expect(created).toEqual([])
    expect(await db.select().from(moves)).toHaveLength(1)
  })

  it('Task の挿入に失敗したら Move も残らない', async () => {
    await seedTemplates(3)
    // Task の id を全部同じにして、2文目の挿入を主キー衝突で失敗させる。
    vi.spyOn(crypto, 'randomUUID').mockReturnValue(
      '11111111-1111-4111-8111-111111111111',
    )

    await expect(createMove(context, input)).rejects.toThrow()

    expect(await db.select().from(moves)).toEqual([])
    expect(await db.select().from(tasks)).toEqual([])
  })
})
