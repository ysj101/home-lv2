import { findMoveByHousehold } from '@/db/repositories/move'
import type { Move } from '@/db/schema'
import type { HouseholdContext } from '@/features/auth/household-context'

/**
 * 現在 Household の Move を返す。MVP では1件なので、未登録なら null。
 */
export async function getMove(context: HouseholdContext): Promise<Move | null> {
  return findMoveByHousehold(context.db, context.household.id)
}
