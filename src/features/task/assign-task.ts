import { updateTaskInHousehold } from '@/db/repositories/task'
import type { Task } from '@/db/schema'
import { notFound } from '@/features/auth/errors'
import type { HouseholdContext } from '@/features/auth/household-context'
import { assertAssignee } from '@/features/task/assert-assignee'

/**
 * Task の担当者を設定・解除する（spec §11 UC-04）。
 * `null` を渡すと未割当に戻る。
 *
 * 選択肢の一覧は `@/features/auth/get-household-members` の
 * `getHouseholdMembers(context)` を使う。
 */
export async function assignTask(
  context: HouseholdContext,
  taskId: string,
  assigneeId: string | null,
): Promise<Task> {
  const task = await updateTaskInHousehold(
    context.db,
    context.household.id,
    taskId,
    { assigneeId: await assertAssignee(context, assigneeId) },
  )

  if (!task) {
    throw notFound('タスクが見つかりません。')
  }

  return task
}
