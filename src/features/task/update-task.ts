import { updateTaskInHousehold } from '@/db/repositories/task'
import type { Task } from '@/db/schema'
import { notFound } from '@/features/auth/errors'
import type { HouseholdContext } from '@/features/auth/household-context'
import { requireTaskCategory, type TaskCategory } from '@/lib/task-category'
import { optionalText, requireDate, requireText } from '@/lib/validation'

export type UpdateTaskInput = {
  title?: string
  description?: string | null
  category?: TaskCategory
  /** `YYYY-MM-DD`。null にすると期限なしになる。 */
  dueDate?: string | null
}

/**
 * Task の内容を更新する（spec §12.3）。
 *
 * 担当者は #26 assignTask、完了状態は #25 completeTask / reopenTask が扱う。
 * ここで混ぜると「編集したら担当が外れた」のような事故が起きるため分けている。
 */
export async function updateTask(
  context: HouseholdContext,
  taskId: string,
  input: UpdateTaskInput,
): Promise<Task> {
  const values: Parameters<typeof updateTaskInHousehold>[3] = {}

  if (input.title !== undefined) {
    values.title = requireText(input.title, 'タイトル')
  }
  if (input.description !== undefined) {
    values.description = optionalText(input.description)
  }
  if (input.category !== undefined) {
    values.category = requireTaskCategory(input.category)
  }
  if (input.dueDate !== undefined) {
    values.dueDate = input.dueDate ? requireDate(input.dueDate, '期限') : null
  }

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
