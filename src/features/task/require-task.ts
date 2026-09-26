import { findTaskInHousehold } from '@/db/repositories/task'
import type { Task } from '@/db/schema'
import { notFound } from '@/features/auth/errors'
import type { HouseholdContext } from '@/features/auth/household-context'

/**
 * Household スコープで Task を1件引く。
 *
 * 他 Household の Task は「存在しない」として 404 にする。403 と区別すると、
 * ID の存在有無が漏れてしまうため。
 */
export async function requireTask(
  context: HouseholdContext,
  taskId: string,
): Promise<Task> {
  const task = await findTaskInHousehold(
    context.db,
    context.household.id,
    taskId,
  )

  if (!task) {
    throw notFound('タスクが見つかりません。')
  }

  return task
}
