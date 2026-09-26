import { updateTaskById } from '@/db/repositories/task'
import type { Task } from '@/db/schema'
import { badRequest } from '@/features/auth/errors'
import type { HouseholdContext } from '@/features/auth/household-context'
import { requireTask } from '@/features/task/require-task'
import { optionalText, requireDate, requireText } from '@/lib/validation'
import { TASK_CATEGORIES, type TaskCategory } from '@/lib/task-category'

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
  await requireTask(context, taskId)

  const values: Parameters<typeof updateTaskById>[2] = {}

  if (input.title !== undefined) {
    values.title = requireText(input.title, 'タイトル')
  }
  if (input.description !== undefined) {
    values.description = optionalText(input.description)
  }
  if (input.category !== undefined) {
    if (!TASK_CATEGORIES.includes(input.category)) {
      throw badRequest(`不明なカテゴリです: ${input.category}`)
    }
    values.category = input.category
  }
  if (input.dueDate !== undefined) {
    values.dueDate = input.dueDate ? requireDate(input.dueDate, '期限') : null
  }

  return updateTaskById(context.db, taskId, values)
}
