import { findMoveByHousehold } from '@/db/repositories/move'
import { insertTasks } from '@/db/repositories/task'
import type { Task } from '@/db/schema'
import { badRequest, notFound } from '@/features/auth/errors'
import type { HouseholdContext } from '@/features/auth/household-context'
import { assertAssignee } from '@/features/task/assert-assignee'
import { optionalText, requireDate, requireText } from '@/lib/validation'
import { TASK_CATEGORIES, type TaskCategory } from '@/lib/task-category'

export type CreateTaskInput = {
  title: string
  description?: string | null
  category: TaskCategory
  /** `YYYY-MM-DD`。未指定なら期限なし。 */
  dueDate?: string | null
  assigneeId?: string | null
}

/**
 * 手動で Task を追加する（spec §11 UC-03）。
 * テンプレート由来と区別できるよう `source = manual` で作る。
 */
export async function createTask(
  context: HouseholdContext,
  input: CreateTaskInput,
): Promise<Task> {
  const move = await findMoveByHousehold(context.db, context.household.id)
  if (!move) {
    throw notFound('先に引越しを登録してください。')
  }

  if (!TASK_CATEGORIES.includes(input.category)) {
    throw badRequest(`不明なカテゴリです: ${input.category}`)
  }

  const dueDate = input.dueDate
    ? requireDate(input.dueDate, '期限')
    : null

  const [task] = await insertTasks(context.db, [
    {
      moveId: move.id,
      title: requireText(input.title, 'タイトル'),
      description: optionalText(input.description),
      category: input.category,
      dueDate,
      assigneeId: await assertAssignee(context, input.assigneeId),
      status: 'todo',
      source: 'manual',
    },
  ])

  return task
}
