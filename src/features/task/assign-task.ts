import { updateTaskById } from '@/db/repositories/task'
import type { Task } from '@/db/schema'
import {
  getHouseholdMembers,
  type HouseholdMemberSummary,
} from '@/features/auth/get-household-members'
import type { HouseholdContext } from '@/features/auth/household-context'
import { assertAssignee } from '@/features/task/assert-assignee'
import { requireTask } from '@/features/task/require-task'

/**
 * Task の担当者を設定・解除する（spec §11 UC-04）。
 * `null` を渡すと未割当に戻る。
 */
export async function assignTask(
  context: HouseholdContext,
  taskId: string,
  assigneeId: string | null,
): Promise<Task> {
  await requireTask(context, taskId)

  return updateTaskById(context.db, taskId, {
    assigneeId: await assertAssignee(context, assigneeId),
  })
}

/** 担当者の選択肢。UI では「未割当」をこの一覧に足して出す。 */
export async function listAssignableMembers(
  context: HouseholdContext,
): Promise<HouseholdMemberSummary[]> {
  return getHouseholdMembers(context.db, context.household.id)
}
