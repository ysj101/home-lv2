import { createFileRoute } from '@tanstack/react-router'

import { NoMove } from '@/components/empty-state'
import { TaskFilters } from '@/components/task-filters'
import { PageTitle } from '@/components/page-title'
import { TaskRow } from '@/components/task-row'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from '@/components/ui/card'
import { fetchMove } from '@/features/move/server'
import { fetchTasks } from '@/features/task/server'
import {
  validateTaskSearch,
  type TaskSearch,
} from '@/features/task/task-search'
import { today } from '@/lib/date'

export const Route = createFileRoute('/tasks')({
  validateSearch: validateTaskSearch,
  // 絞り込みが変わったら読み直す。
  loaderDeps: ({ search }: { search: TaskSearch }) => search,
  loader: async ({ deps }) => {
    const move = await fetchMove()
    if (!move) return { move: null, tasks: [], today: today() }

    return { move, tasks: await fetchTasks({ data: deps }), today: today() }
  },
  component: TaskList,
})

function TaskList() {
  const { move, tasks, today: currentDate } = Route.useLoaderData()
  const search = Route.useSearch()

  if (!move) {
    return (
      <NoMove description="引越しを登録すると、標準の Quest がまとめて作られます。" />
    )
  }

  const remaining = tasks.filter((task) => task.status !== 'completed').length

  return (
    <Card>
      <CardHeader>
        <PageTitle>Quests</PageTitle>
        <CardDescription>
          {tasks.length === 0
            ? '条件に合う Quest がありません。'
            : `全 ${tasks.length} 件のうち ${remaining} 件が残っています。`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <TaskFilters search={search} />

        {tasks.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            条件に合う Quest がありません。
          </p>
        ) : (
          <ul aria-label="Quest 一覧" className="-mt-3">
            {tasks.map((task) => (
              <TaskRow key={task.id} task={task} today={currentDate} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
