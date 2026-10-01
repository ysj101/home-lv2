import { TaskRow } from '@/components/task-row'
import type { TaskListItem } from '@/features/task/get-tasks'

/**
 * Quest の一覧。Task List 画面と Dashboard のセクションで共通に使う。
 * `label` は支援技術とテストから一覧を特定するための名前。
 */
export function TaskList({
  tasks,
  today,
  label,
  emptyText,
}: {
  tasks: TaskListItem[]
  today: string
  label: string
  emptyText: string
}) {
  if (tasks.length === 0) {
    return <p className="py-4 text-sm text-muted-foreground">{emptyText}</p>
  }

  return (
    <ul aria-label={label} className="-mt-1">
      {tasks.map((task) => (
        <TaskRow key={task.id} task={task} today={today} />
      ))}
    </ul>
  )
}
