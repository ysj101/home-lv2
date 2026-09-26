import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/sqlite-proxy'

import type { Db } from '@/db/client'
import * as schema from '@/db/schema'

/**
 * テスト用の in-memory データベース。
 *
 * D1 は SQLite なので、`src/db/migrations` の同じマイグレーションを流した
 * better-sqlite3 に対して Use Case をそのまま実行できる。sqlite-proxy 経由で
 * 非同期ドライバとして包むため、型は本番の `Db` と同一になる。
 */

const MIGRATIONS_DIR = join(process.cwd(), 'src/db/migrations')

/** drizzle-kit が生成した順にマイグレーションの SQL 文を読み出す。 */
function readMigrationStatements(): string[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith('.sql'))
    .sort()
    .flatMap((file) =>
      readFileSync(join(MIGRATIONS_DIR, file), 'utf8')
        .split('--> statement-breakpoint')
        .map((statement) => statement.trim())
        .filter(Boolean),
    )
}

export type TestDb = Db & {
  /** 明示的に閉じる。テストの afterEach で呼ぶ。 */
  close(): void
}

export function createTestDb(): TestDb {
  const sqlite = new Database(':memory:')
  // D1 と同じく外部キー制約を効かせる。
  sqlite.pragma('foreign_keys = ON')

  for (const statement of readMigrationStatements()) {
    sqlite.exec(statement)
  }

  const run = (sql: string, params: unknown[], method: string) => {
    const statement = sqlite.prepare(sql)

    if (method === 'run' || !statement.reader) {
      statement.run(...(params as never[]))
      return { rows: [] as unknown[] }
    }

    const rows = statement.raw().all(...(params as never[])) as unknown[]

    return { rows: method === 'get' ? ((rows[0] ?? []) as unknown[]) : rows }
  }

  const db = drizzle(
    async (sql, params, method) => run(sql, params, method),
    async (queries) =>
      queries.map(({ sql, params, method }) => run(sql, params, method)),
    { schema },
  ) as unknown as Db

  return Object.assign(db, { close: () => sqlite.close() })
}

/**
 * drizzle は SQLite のエラーを `Failed query: ...` で包んでしまうので、
 * 制約違反を検証するテストのために元のメッセージを取り出す。
 */
export function sqliteErrorMessage(error: unknown): string {
  const cause = (error as { cause?: { message?: string } } | null)?.cause

  return cause?.message ?? (error as Error | null)?.message ?? String(error)
}
