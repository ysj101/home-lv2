import { badRequest } from '@/features/auth/errors'
import { isHouseholdMember } from '@/features/auth/get-household-members'
import type { HouseholdContext } from '@/features/auth/household-context'

/**
 * 担当者が同じ Household のメンバーであることを確認する。
 * `null`（未割当）は常に許可する。
 */
export async function assertAssignee(
  context: HouseholdContext,
  assigneeId: string | null | undefined,
): Promise<string | null> {
  if (!assigneeId) return null

  if (!(await isHouseholdMember(context.db, context.household.id, assigneeId))) {
    throw badRequest('担当者は同じ Household のメンバーから選んでください。')
  }

  return assigneeId
}
