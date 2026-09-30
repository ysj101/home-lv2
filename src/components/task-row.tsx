import { Link, useRouter } from '@tanstack/react-router'
import { useState } from 'react'

import { HydratedCheckbox } from '@/components/hydrated'
import type { TaskListItem } from '@/features/task/get-tasks'
import {
  submitCompleteTask,
  submitReopenTask,
} from '@/features/task/server'
import { isOverdue } from '@/lib/dashboard'
import { toMonthDay } from '@/lib/date'
import { categoryLabel } from '@/lib/task-category'
import { cn } from '@/lib/utils'

export function TaskRow({
  task,
  today,
}: {
  task: TaskListItem
  today: string
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const overdue = isOverdue(task, today)
  const due = task.dueDate ? toMonthDay(task.dueDate) : null
  const completed = task.status === 'completed'

  async function toggle() {
    setBusy(true)
    try {
      const data = { id: task.id }
      if (completed) await submitReopenTask({ data })
      else await submitCompleteTask({ data })

      await router.invalidate()
    } finally {
      setBusy(false)
    }
  }

  return (
    <li>
      <div
        className={cn(
          'flex items-start gap-3 border-b px-1 py-3',
          overdue && 'border-l-2 border-l-destructive pl-3',
        )}
      >
        <HydratedCheckbox
          checked={completed}
          disabled={busy}
          onCheckedChange={toggle}
          aria-label={`${task.title} を${completed ? '未完了に戻す' : '完了にする'}`}
          // タップ領域を確保する（spec §25 Mobile First）。
          className="mt-0.5 size-5"
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
            {completed ? (
              <span>
                Cleared
                {task.completedByName ? ` by ${task.completedByName}` : ''}
              </span>
            ) : due ? (
              <span className={cn(overdue && 'font-medium text-destructive')}>
                期限 {due}
                {overdue ? '（超過）' : ''}
              </span>
            ) : (
              <span>期限なし</span>
            )}
            {completed ? null : <span>{task.assigneeName ?? '未割当'}</span>}
            <span>{categoryLabel(task.category)}</span>
          </p>
        </Link>
      </div>
    </li>
  )
}
