import { updateTaskById } from '@/db/repositories/task'
import type { Task } from '@/db/schema'
import type { HouseholdContext } from '@/features/auth/household-context'
import { requireTask } from '@/features/task/require-task'

/**
 * Task を完了にする（spec §11 UC-05）。
 * 誰がいつ完了したかを記録する（spec §25 Data Integrity）。
 *
 * 将来ここに副作用が増える想定（spec §14）。
 *   completeTask()
 *     ├─ D1 update            ← 今はこれだけ
 *     ├─ Queue event          ← Phase 4
 *     └─ Realtime notification ← Phase 5
 * 副作用は DB 更新の後に足し、失敗しても完了状態は巻き戻さない方針にする。
 */
export async function completeTask(
  context: HouseholdContext,
  taskId: string,
  completedAt: Date = new Date(),
): Promise<Task> {
  await requireTask(context, taskId)

  return updateTaskById(context.db, taskId, {
    status: 'completed',
    completedAt,
    completedBy: context.user.id,
  })
}

/**
 * 完了を取り消す（spec §11 UC-06）。完了情報はクリアする。
 * 副作用の拡張ポイントは completeTask と同じ。
 */
export async function reopenTask(
  context: HouseholdContext,
  taskId: string,
): Promise<Task> {
  await requireTask(context, taskId)

  return updateTaskById(context.db, taskId, {
    status: 'todo',
    completedAt: null,
    completedBy: null,
  })
}
