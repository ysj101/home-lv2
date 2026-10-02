import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { insertTasksStatements } from '@/db/repositories/task'
import type { NewTask } from '@/db/schema'
import { createTestDb, type TestDb } from '@/db/test-db'

/** D1 の上限。1文あたりのバインド変数はこれを超えられない。 */
const D1_MAX_BOUND_PARAMS = 100

let db: TestDb

beforeEach(() => {
  db = createTestDb()
})

afterEach(() => db.close())

function taskValues(count: number): NewTask[] {
  return Array.from({ length: count }, (_, index) => ({
    moveId: 'm1',
    title: `タスク${index}`,
    description: '説明',
    category: 'other' as const,
    dueDate: '2026-11-15',
    assigneeId: null,
    status: 'todo' as const,
    source: 'template' as const,
    templateId: `tpl-${index}`,
  }))
}

describe('insertTasksStatements', () => {
  it('どの文もバインド変数が D1 の上限を超えない', () => {
    // 標準テンプレートは25件。1文にまとめると上限を超える。
    const statements = insertTasksStatements(db, taskValues(25))

    expect(statements.length).toBeGreaterThan(1)
    for (const statement of statements) {
      expect(statement.toSQL().params.length).toBeLessThanOrEqual(
        D1_MAX_BOUND_PARAMS,
      )
    }
  })

  it('全件を過不足なく分割する', () => {
    const statements = insertTasksStatements(db, taskValues(25))
    const total = statements.reduce(
      (sum, statement) => sum + statement.toSQL().params.length,
      0,
    )
    const perRow = insertTasksStatements(db, taskValues(1))[0].toSQL().params
      .length

    expect(total).toBe(perRow * 25)
  })

  it('空配列なら文を作らない', () => {
    expect(insertTasksStatements(db, [])).toEqual([])
  })

  it('上限ちょうどの件数でも1文に収まる', () => {
    const [statement] = insertTasksStatements(db, taskValues(8))

    expect(statement.toSQL().params.length).toBeLessThanOrEqual(
      D1_MAX_BOUND_PARAMS,
    )
  })
})
