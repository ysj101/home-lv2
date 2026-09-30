import { Link } from '@tanstack/react-router'

import { Checkbox } from '@/components/ui/checkbox'
import type { TaskListItem } from '@/features/task/get-tasks'
import { isOverdue } from '@/lib/dashboard'
import { categoryLabel } from '@/lib/task-category'
import { cn } from '@/lib/utils'

/** 期限を M/D で表示する。期限なしは null。 */
function formatDueDate(dueDate: string | null): string | null {
  if (!dueDate) return null

  const [, month, day] = dueDate.split('-')

  return `${Number(month)}/${Number(day)}`
}

export function TaskRow({
  task,
  today,
}: {
  task: TaskListItem
  today: string
}) {
  const overdue = isOverdue(task, today)
  const due = formatDueDate(task.dueDate)
  const completed = task.status === 'completed'

  return (
    <li>
      <div
        className={cn(
          'flex items-start gap-3 border-b px-1 py-3',
          overdue && 'border-l-2 border-l-destructive pl-3',
        )}
      >
        {/* 完了トグルの配線は #35 で行う。ここでは状態表示のみ。 */}
        <Checkbox
          checked={completed}
          disabled
          aria-label={`${task.title} の完了状態`}
          className="mt-1"
        />

        <Link
          to="/tasks/$id"
          params={{ id: task.id }}
          className="min-w-0 flex-1"
        >
          <p
            className={cn(
              'text-sm font-medium',
              completed && 'text-muted-foreground line-through',
            )}
          >
            {task.title}
          </p>

          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {due ? (
              <span className={cn(overdue && 'font-medium text-destructive')}>
                期限 {due}
                {overdue ? '（超過）' : ''}
              </span>
            ) : (
              <span>期限なし</span>
            )}
            <span>{task.assigneeName ?? '未割当'}</span>
            <span>{categoryLabel(task.category)}</span>
          </p>
        </Link>
      </div>
    </li>
  )
}
