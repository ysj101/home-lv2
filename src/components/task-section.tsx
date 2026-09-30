import { Link } from '@tanstack/react-router'

import { TaskList } from '@/components/task-list'
import type { TaskListItem } from '@/features/task/get-tasks'
import type { TaskSearch } from '@/features/task/task-search'

/** 1セクションに出す最大件数。これを超えたら「すべて見る」へ誘導する。 */
const MAX_ITEMS = 5

/**
 * Dashboard の各セクション（今日 / 今週 / 期限超過 / 最近完了）。
 * 行は一覧と同じ TaskRow を使うので、完了トグルも詳細への遷移もそのまま効く。
 */
export function TaskSection({
  title,
  tasks,
  today,
  seeAll,
  emptyText,
}: {
  title: string
  tasks: TaskListItem[]
  today: string
  seeAll?: TaskSearch
  emptyText: string
}) {
  const shown = tasks.slice(0, MAX_ITEMS)

  return (
    <section className="space-y-2">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-medium">
          {title}
          {tasks.length > 0 ? (
            <span className="ml-2 text-xs font-normal text-muted-foreground tabular-nums">
              {tasks.length}
            </span>
          ) : null}
        </h2>
        {seeAll && tasks.length > shown.length ? (
          <Link
            to="/tasks"
            search={seeAll}
            // タップ領域を確保する（spec §25 Mobile First）。
            className="inline-flex min-h-11 items-center px-1 text-xs text-muted-foreground underline-offset-4 hover:underline"
          >
            すべて見る
          </Link>
        ) : null}
      </div>

      <TaskList
        tasks={shown}
        today={today}
        label={`${title} の Quest`}
        emptyText={emptyText}
      />
    </section>
  )
}
