import { findMoveByHousehold } from '@/db/repositories/move'
import type { Move } from '@/db/schema'
import { notFound } from '@/features/auth/errors'
import type { HouseholdContext } from '@/features/auth/household-context'

/**
 * Household スコープで Move を1件引く。
 *
 * 他 Household の Move は「存在しない」として 404 にする（requireTask と同じ方針）。
 * MVP では Household ごとに Move は1件なので、その1件と ID が一致するかで判定する。
 */
export async function requireMove(
  context: HouseholdContext,
  moveId: string,
): Promise<Move> {
  const move = await findMoveByHousehold(context.db, context.household.id)

  if (!move || move.id !== moveId) {
    throw notFound('引越しが見つかりません。')
  }

  return move
}
