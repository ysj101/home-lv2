import { describe, expect, it } from 'vitest'

import { households, taskTemplates } from '@/db/schema'
import { buildInsertStatement, raw } from '@/db/seed/sql'

describe('buildInsertStatement', () => {
  it('テーブル名とカラム名をスキーマ定義から引く（キャメル → スネーク）', () => {
    const statement = buildInsertStatement(
      taskTemplates,
      {
        id: 'x',
        title: 'T',
        offsetDays: -7,
        sortOrder: 1,
      },
      { target: ['id'], action: 'nothing' },
    )

    expect(statement).toContain(
      'INSERT INTO task_templates (id, title, offset_days, sort_order)',
    )
  })

  it('action: update は target 以外を excluded で上書きする', () => {
    const statement = buildInsertStatement(
      taskTemplates,
      { id: 'x', title: 'T', sortOrder: 1 },
      { target: ['id'], action: 'update' },
    )

    expect(statement).toContain(
      'ON CONFLICT(id) DO UPDATE SET title = excluded.title, sort_order = excluded.sort_order',
    )
    expect(statement).not.toContain('id = excluded.id')
  })

  it('raw() の値は式としてそのまま埋め込む', () => {
    const statement = buildInsertStatement(
      households,
      { id: raw('(SELECT id FROM households LIMIT 1)'), name: 'Our Family' },
      { target: ['id'], action: 'nothing' },
    )

    expect(statement).toContain('VALUES ((SELECT id FROM households LIMIT 1),')
  })

  it('null は NULL、数値はクォートせずに埋め込む', () => {
    const statement = buildInsertStatement(
      taskTemplates,
      { id: 'x', description: null, offsetDays: -7 },
      { target: ['id'], action: 'nothing' },
    )

    expect(statement).toContain("VALUES ('x', NULL, -7)")
  })

  it('スキーマに無いカラムを渡したら失敗する', () => {
    expect(() =>
      buildInsertStatement(
        households,
        // @ts-expect-error スキーマに存在しないカラム
        { id: 'x', nope: 'y' },
        { target: ['id'], action: 'nothing' },
      ),
    ).toThrow('households に nope というカラムはありません')
  })
})
