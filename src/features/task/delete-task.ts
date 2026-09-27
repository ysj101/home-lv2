import { deleteTaskInHousehold } from '@/db/repositories/task'
import { notFound } from '@/features/auth/errors'
import type { HouseholdContext } from '@/features/auth/household-context'

/**
 * Task を物理削除する。
 *
 * テンプレート由来かどうかに関わらず削除できる。消したテンプレート由来の
 * Task は引越し日の再計算（#20）でも復活しない。
 */
export async function deleteTask(
  context: HouseholdContext,
  taskId: string,
): Promise<void> {
  const deleted = await deleteTaskInHousehold(
    context.db,
    context.household.id,
    taskId,
  )

  if (!deleted) {
    throw notFound('タスクが見つかりません。')
  }
}
