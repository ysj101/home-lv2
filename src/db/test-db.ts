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

/**
 * drizzle-kit が生成した順にマイグレーション SQL を読む。
 *
 * 内容はテスト実行中に変わらないので一度だけ読んで使い回す。
 * ファイルは分割せずそのまま渡す（better-sqlite3 の `exec` が複数文を解釈でき、
 * `--> statement-breakpoint` は SQL のコメントとして無視されるため、
 * drizzle-kit の出力フォーマットに依存しなくて済む）。
 */
let migrations: string[] | undefined

function readMigrations(): string[] {
  return (migrations ??= readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith('.sql'))
    .sort()
    .map((file) => readFileSync(join(MIGRATIONS_DIR, file), 'utf8')))
}

export type TestDb = Db & {
  /** 明示的に閉じる。テストの afterEach で呼ぶ。 */
  close(): void
}

export function createTestDb(): TestDb {
  const sqlite = new Database(':memory:')
  // D1 と同じく外部キー制約を効かせる。
  sqlite.pragma('foreign_keys = ON')

  for (const migration of readMigrations()) {
    sqlite.exec(migration)
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

  // D1 の batch は1つのトランザクションなので、テスト側も同じ意味になるよう
  // better-sqlite3 のトランザクションで包む（途中で失敗したら全部巻き戻る）。
  const runBatch = sqlite.transaction(
    (queries: { sql: string; params: unknown[]; method: string }[]) =>
      queries.map(({ sql, params, method }) => run(sql, params, method)),
  )

  const db = drizzle(
    async (sql, params, method) => run(sql, params, method),
    async (queries) => runBatch(queries),
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
