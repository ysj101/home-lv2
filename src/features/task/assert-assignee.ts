import { getHouseholdMembers } from '@/features/auth/get-household-members'
import { badRequest } from '@/features/auth/errors'
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

  const members = await getHouseholdMembers(context.db, context.household.id)

  if (!members.some((member) => member.id === assigneeId)) {
    throw badRequest('担当者は同じ Household のメンバーから選んでください。')
  }

  return assigneeId
}
