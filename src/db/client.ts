import { drizzle } from 'drizzle-orm/d1'

import * as schema from '@/db/schema'

/** D1 バインディングから Drizzle クライアントを生成する。 */
export function createDb(d1: D1Database) {
  return drizzle(d1, { schema })
}

export type Db = ReturnType<typeof createDb>
