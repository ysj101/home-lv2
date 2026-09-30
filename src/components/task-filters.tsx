import { Link, useNavigate } from '@tanstack/react-router'

import { HydratedSelect } from '@/components/hydrated'
import {
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { TaskSearch } from '@/features/task/task-search'
import { TASK_CATEGORY_OPTIONS, type TaskCategory } from '@/lib/task-category'
import { cn } from '@/lib/utils'

const STATUS_OPTIONS = [
  { value: 'all', label: 'すべて' },
  { value: 'todo', label: '未完了' },
  { value: 'completed', label: '完了' },
  { value: 'overdue', label: '期限超過' },
] as const

const ASSIGNEE_OPTIONS = [
  { value: 'me', label: '自分' },
  { value: 'partner', label: '相手' },
  { value: 'unassigned', label: '未割当' },
] as const

/**
 * 絞り込みは URL に持たせる。リロードしても戻っても同じ結果になり、
 * 「この条件を共有する」もできる。
 */
export function TaskFilters({ search }: { search: TaskSearch }) {
  return (
    <div className="space-y-3">
      <Segmented
        label="状態"
        options={STATUS_OPTIONS}
        current={search.status ?? 'all'}
        toSearch={(value) => ({
          ...search,
          status: value === 'all' ? undefined : value,
        })}
      />

      <Segmented
        label="担当"
        options={ASSIGNEE_OPTIONS}
        current={search.assignee}
        // 同じものをもう一度押したら解除する。
        toSearch={(value) => ({
          ...search,
          assignee: search.assignee === value ? undefined : value,
        })}
      />

      <CategorySelect search={search} />
    </div>
  )
}

function Segmented<TValue extends string>({
  label,
  options,
  current,
  toSearch,
}: {
  label: string
  options: readonly { value: TValue; label: string }[]
  current: string | undefined
  toSearch: (value: TValue) => TaskSearch
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-8 shrink-0 text-xs text-muted-foreground">
        {label}
      </span>
      <ul className="flex flex-wrap gap-1">
        {options.map((option) => {
          const active = current === option.value

          return (
            <li key={option.value}>
              <Link
                to="/tasks"
                search={toSearch(option.value)}
                aria-current={active ? 'true' : undefined}
                className={cn(
                  'inline-flex min-h-9 items-center rounded-full border px-3 text-xs transition-colors',
                  active
                    ? 'border-transparent bg-primary text-primary-foreground'
                    : 'text-muted-foreground',
                )}
              >
                {option.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

const ALL_CATEGORIES = '__all__'

function CategorySelect({ search }: { search: TaskSearch }) {
  const navigate = useNavigate({ from: '/tasks' })

  return (
    <div className="flex items-center gap-2">
      <span className="w-8 shrink-0 text-xs text-muted-foreground">分類</span>
      <HydratedSelect
        value={search.category ?? ALL_CATEGORIES}
        onValueChange={(value) =>
          // Select はリンクにできないので、選択時にルーター側で遷移する。
          navigate({
            search: {
              ...search,
              category:
                value === ALL_CATEGORIES ? undefined : (value as TaskCategory),
            },
          })
        }
      >
        <SelectTrigger className="h-9 flex-1" aria-label="カテゴリ">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_CATEGORIES}>すべての分類</SelectItem>
          {TASK_CATEGORY_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </HydratedSelect>
    </div>
  )
}
