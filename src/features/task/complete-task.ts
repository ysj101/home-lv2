import { updateTaskInHousehold } from '@/db/repositories/task'
import type { NewTask, Task } from '@/db/schema'
import { notFound } from '@/features/auth/errors'
import type { HouseholdContext } from '@/features/auth/household-context'

/** Household スコープで更新し、対象が無ければ 404。 */
async function update(
  context: HouseholdContext,
  taskId: string,
  values: Partial<Omit<NewTask, 'id' | 'moveId'>>,
): Promise<Task> {
  const task = await updateTaskInHousehold(
    context.db,
    context.household.id,
    taskId,
    values,
  )

  if (!task) {
    throw notFound('タスクが見つかりません。')
  }

  return task
}

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
  return update(context, taskId, {
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
  return update(context, taskId, {
    status: 'todo',
    completedAt: null,
    completedBy: null,
  })
}
