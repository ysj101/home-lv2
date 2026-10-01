import { createServerFn } from '@tanstack/react-start'

import { requireContext } from '@/features/auth/context'
import {
  completeTask,
  reopenTask,
} from '@/features/task/complete-task'
import { createTask, type CreateTaskInput } from '@/features/task/create-task'
import { deleteTask } from '@/features/task/delete-task'
import {
  getTask,
  getTasks,
  type GetTasksFilter,
} from '@/features/task/get-tasks'
import { updateTask, type UpdateTaskInput } from '@/features/task/update-task'
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

/** 詳細用に1件だけ取る。 */
export const fetchTask = createServerFn()
  .validator((data: { id: string }) => data)
  .handler(async ({ data }) => getTask(await requireContext(), data.id))

export const submitUpdateTask = createServerFn({ method: 'POST' })
  .validator((data: { id: string; input: UpdateTaskInput }) => data)
  .handler(async ({ data }) =>
    updateTask(await requireContext(), data.id, data.input),
  )

export const submitDeleteTask = createServerFn({ method: 'POST' })
  .validator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    await deleteTask(await requireContext(), data.id)

    return { ok: true as const }
  })

export const submitCompleteTask = createServerFn({ method: 'POST' })
  .validator((data: { id: string }) => data)
  .handler(async ({ data }) => completeTask(await requireContext(), data.id))

export const submitReopenTask = createServerFn({ method: 'POST' })
  .validator((data: { id: string }) => data)
  .handler(async ({ data }) => reopenTask(await requireContext(), data.id))
