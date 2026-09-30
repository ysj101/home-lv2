import { createServerFn } from '@tanstack/react-start'

import { requireContext } from '@/features/auth/context'
import { createTask, type CreateTaskInput } from '@/features/task/create-task'
import { getTasks, type GetTasksFilter } from '@/features/task/get-tasks'
import { today } from '@/lib/date'

/** Route から呼ぶ Task の Server Function。 */

export type TaskListFilter = Omit<GetTasksFilter, 'today'>

/**
 * 一覧を取得する。「今日」はサーバー側で決める。
 * クライアントから渡すと端末の時計に左右されるため。
 */
export const fetchTasks = createServerFn()
  .validator((data: TaskListFilter | undefined) => data ?? {})
  .handler(async ({ data }) =>
    getTasks(await requireContext(), { ...data, today: today() }),
  )

export const submitCreateTask = createServerFn({ method: 'POST' })
  .validator((data: CreateTaskInput) => data)
  .handler(async ({ data }) => createTask(await requireContext(), data))
