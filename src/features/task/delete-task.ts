import { deleteTaskById } from '@/db/repositories/task'
import type { HouseholdContext } from '@/features/auth/household-context'
import { requireTask } from '@/features/task/require-task'

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
  await requireTask(context, taskId)

  await deleteTaskById(context.db, taskId)
}
