import { getTableColumns, getTableName } from 'drizzle-orm'
import type { SQLiteTable } from 'drizzle-orm/sqlite-core'

/** SQL 文字列リテラルとして安全に埋め込めるようクォートする。 */
export function quote(value: string): string {
  return `'${value.replace(/'/g, "''")}'`
}

/** そのまま SQL 式として埋め込む値（サブクエリや関数呼び出し）。 */
export type RawSql = { readonly sql: string }

export function raw(sql: string): RawSql {
  return { sql }
}

function literal(value: unknown): string {
  if (value === null || value === undefined) return 'NULL'
  if (typeof value === 'number') return String(value)
  if (typeof value === 'string') return quote(value)
  if (typeof value === 'object' && 'sql' in value) return (value as RawSql).sql
  throw new Error(`seed で扱えない値です: ${String(value)}`)
}

/**
 * 競合時の扱い。
 * - `nothing`: 運用中にユーザーが変更しうるデータ（Household / User）。既存行に触らない。
 * - `update` : アプリがマスタとして所有する定義データ（TaskTemplate）。seed を唯一の
 *              定義元として既存行へ反映する。
 */
type ConflictAction = 'nothing' | 'update'

/** 各カラムには本来の型か、SQL 式（サブクエリ等）を渡せる。 */
type SeedRow<TInsert> = {
  [K in keyof TInsert]?: TInsert[K] | RawSql
}

type InsertOptions<TInsert> = {
  /** ON CONFLICT の対象列。 */
  target: (keyof TInsert)[]
  action: ConflictAction
}

/**
 * 冪等な INSERT 文を組み立てる。
 *
 * テーブル名とカラム名は Drizzle のスキーマ定義から引くので、seed 側に
 * 文字列を持たない。行のキーも `$inferInsert` で型チェックされる。
 */
export function buildInsertStatement<TTable extends SQLiteTable>(
  table: TTable,
  row: SeedRow<TTable['$inferInsert']>,
  options: InsertOptions<TTable['$inferInsert']>,
): string {
  const schemaColumns = getTableColumns(table)
  const keys = Object.keys(row) as (keyof typeof row & string)[]

  const columnName = (key: string) => {
    const column = schemaColumns[key as keyof typeof schemaColumns]
    if (!column) {
      throw new Error(
        `${getTableName(table)} に ${key} というカラムはありません。`,
      )
    }
    return column.name
  }

  const columns = keys.map(columnName).join(', ')
  const values = keys.map((key) => literal(row[key])).join(', ')
  const target = options.target.map((key) => columnName(key as string))

  const onConflict =
    options.action === 'nothing'
      ? 'DO NOTHING'
      : `DO UPDATE SET ${keys
          .filter((key) => !options.target.includes(key))
          .map((key) => `${columnName(key)} = excluded.${columnName(key)}`)
          .join(', ')}`

  return [
    `INSERT INTO ${getTableName(table)} (${columns})`,
    `VALUES (${values})`,
    `ON CONFLICT(${target.join(', ')}) ${onConflict};`,
  ].join(' ')
}
