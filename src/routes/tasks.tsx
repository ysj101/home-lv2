import { createFileRoute } from '@tanstack/react-router'

import { NoMove } from '@/components/empty-state'
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
import { today } from '@/lib/date'

export const Route = createFileRoute('/tasks')({
  loader: async () => {
    const move = await fetchMove()
    if (!move) return { move: null, tasks: [], today: today() }

    return { move, tasks: await fetchTasks(), today: today() }
  },
  component: TaskList,
})

function TaskList() {
  const { move, tasks, today: currentDate } = Route.useLoaderData()

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
            ? 'まだ Quest がありません。'
            : `全 ${tasks.length} 件のうち ${remaining} 件が残っています。`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {tasks.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Quest を追加するか、引越し日を設定して標準 Quest を作ってください。
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
