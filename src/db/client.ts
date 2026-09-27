import { drizzle } from 'drizzle-orm/d1'
import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core'

import * as schema from '@/db/schema'

/**
 * アプリが使う DB ハンドル。
 *
 * D1 の実装に固定せず非同期 SQLite として型付けしておくことで、テストでは
 * in-memory SQLite を同じ型で差し込める（`@/db/test-db`）。
 */
export type Db = BaseSQLiteDatabase<'async', unknown, typeof schema>

/** D1 バインディングから Drizzle クライアントを生成する。 */
export function createDb(d1: D1Database): Db {
  return drizzle(d1, { schema })
}
