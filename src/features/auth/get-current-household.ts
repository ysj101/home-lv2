import { eq } from 'drizzle-orm'

import type { Db } from '@/db/client'
import { households, householdMembers, type Household } from '@/db/schema'
import { forbidden } from '@/features/auth/errors'

/**
 * User が所属する Household を返す。
 *
 * MVP では Household は1件なので、複数所属していても先頭を返す。
 * 所属が無い User は 403（spec §25 Data Integrity）。
 */
export async function getCurrentHousehold(
  db: Db,
  userId: string,
): Promise<Household> {
  const [row] = await db
    .select({ household: households })
    .from(householdMembers)
    .innerJoin(households, eq(households.id, householdMembers.householdId))
    .where(eq(householdMembers.userId, userId))
    .limit(1)

  if (!row) {
    throw forbidden('この User はどの Household にも所属していません。')
  }

  return row.household
}
