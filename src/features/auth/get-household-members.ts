import { and, eq } from 'drizzle-orm'

import type { Db } from '@/db/client'
import { householdMembers, users } from '@/db/schema'
import type { HouseholdContext } from '@/features/auth/household-context'

export type HouseholdMemberSummary = {
  id: string
  name: string
  email: string
}

/** Household のメンバー一覧。担当者の選択肢に使う（spec §11 UC-04）。 */
export async function getHouseholdMembers(
  context: HouseholdContext,
): Promise<HouseholdMemberSummary[]> {
  return context.db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(householdMembers)
    .innerJoin(users, eq(users.id, householdMembers.userId))
    .where(eq(householdMembers.householdId, context.household.id))
}

/**
 * 1人が Household に所属しているかだけを確認する。
 * 担当者の検証で全メンバーを読まずに済ませるため、一覧取得とは分けている。
 */
export async function isHouseholdMember(
  db: Db,
  householdId: string,
  userId: string,
): Promise<boolean> {
  const [member] = await db
    .select({ userId: householdMembers.userId })
    .from(householdMembers)
    .where(
      and(
        eq(householdMembers.householdId, householdId),
        eq(householdMembers.userId, userId),
      ),
    )
    .limit(1)

  return member !== undefined
}
