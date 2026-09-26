import { eq } from 'drizzle-orm'

import type { Db } from '@/db/client'
import { householdMembers, users } from '@/db/schema'

export type HouseholdMemberSummary = {
  id: string
  name: string
  email: string
}

/** Household のメンバー一覧。担当者の選択肢に使う（spec §11 UC-04）。 */
export async function getHouseholdMembers(
  db: Db,
  householdId: string,
): Promise<HouseholdMemberSummary[]> {
  return db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(householdMembers)
    .innerJoin(users, eq(users.id, householdMembers.userId))
    .where(eq(householdMembers.householdId, householdId))
}
