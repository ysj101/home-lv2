import { and, eq } from 'drizzle-orm'

import type { Db } from '@/db/client'
import { moves, type Move, type NewMove } from '@/db/schema'

/**
 * moves テーブルへのアクセス。
 *
 * すべての関数が `householdId` を必須で受け取り、条件に必ず含める。
 * Use Case 側でスコープを付け忘れてもここで守られるようにするため。
 */

export async function findMoveByHousehold(
  db: Db,
  householdId: string,
): Promise<Move | null> {
  const [move] = await db
    .select()
    .from(moves)
    .where(eq(moves.householdId, householdId))
    .limit(1)

  return move ?? null
}

export async function insertMove(db: Db, values: NewMove): Promise<Move> {
  const [move] = await db.insert(moves).values(values).returning()

  return move
}

export async function updateMoveById(
  db: Db,
  householdId: string,
  moveId: string,
  values: Partial<Omit<NewMove, 'id' | 'householdId'>>,
): Promise<Move | null> {
  const [move] = await db
    .update(moves)
    .set({ ...values, updatedAt: new Date() })
    .where(and(eq(moves.id, moveId), eq(moves.householdId, householdId)))
    .returning()

  return move ?? null
}
