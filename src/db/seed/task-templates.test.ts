import { describe, expect, it } from 'vitest'

import {
  TASK_TEMPLATE_SEEDS,
  buildTaskTemplateSeedStatements,
} from '@/db/seed/task-templates'
import { addDays } from '@/lib/date'
import { TASK_CATEGORIES } from '@/lib/task-category'

describe('TASK_TEMPLATE_SEEDS', () => {
  it('標準 TODO が 20 件以上ある', () => {
    expect(TASK_TEMPLATE_SEEDS.length).toBeGreaterThanOrEqual(20)
  })

  it('ID が重複していない', () => {
    const ids = TASK_TEMPLATE_SEEDS.map((seed) => seed.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('category が spec §10 の9種に収まっている', () => {
    for (const seed of TASK_TEMPLATE_SEEDS) {
      expect(TASK_CATEGORIES).toContain(seed.category)
    }
  })

  it('期限の早い順に並んでいる（並びがそのまま sort_order になる）', () => {
    const offsets = TASK_TEMPLATE_SEEDS.map((seed) => seed.offsetDays)
    expect(offsets).toEqual([...offsets].sort((a, b) => a - b))
  })

  it('offset_days から期限を算出できる', () => {
    const electricity = TASK_TEMPLATE_SEEDS.find(
      (seed) => seed.id === 'electricity',
    )
    expect(electricity?.offsetDays).toBe(-7)
    expect(addDays('2026-11-15', electricity!.offsetDays)).toBe('2026-11-08')
  })
})

describe('buildTaskTemplateSeedStatements', () => {
  it('テンプレート1件につき1文を組み立てる', () => {
    expect(buildTaskTemplateSeedStatements()).toHaveLength(
      TASK_TEMPLATE_SEEDS.length,
    )
  })

  it('sort_order を配列の並び順から採番する', () => {
    const statements = buildTaskTemplateSeedStatements([
      {
        id: 'a',
        title: 'A',
        description: '',
        category: 'other',
        offsetDays: -1,
      },
      {
        id: 'b',
        title: 'B',
        description: '',
        category: 'other',
        offsetDays: 1,
      },
    ])

    expect(statements[0]).toContain("'a', 'A', '', 'other', -1, 1)")
    expect(statements[1]).toContain("'b', 'B', '', 'other', 1, 2)")
  })

  it('再実行しても増えないよう ON CONFLICT で upsert する', () => {
    for (const statement of buildTaskTemplateSeedStatements()) {
      expect(statement).toContain('ON CONFLICT(id) DO UPDATE SET')
    }
  })
})
