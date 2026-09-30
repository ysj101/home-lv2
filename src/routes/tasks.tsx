import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useState } from 'react'

import { NoMove } from '@/components/empty-state'
import { TaskFilters } from '@/components/task-filters'
import { PageTitle } from '@/components/page-title'
import { TaskForm } from '@/components/task-form'
import { TaskRow } from '@/components/task-row'
import { HydratedButton } from '@/components/hydrated-button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from '@/components/ui/card'
import { fetchMove } from '@/features/move/server'
import {
  fetchHouseholdMembers,
  fetchTasks,
  submitCreateTask,
} from '@/features/task/server'
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
    if (!move) {
      return { move: null, tasks: [], members: [], today: today() }
    }

    const [tasks, members] = await Promise.all([
      fetchTasks({ data: deps }),
      fetchHouseholdMembers(),
    ])

    return { move, tasks, members, today: today() }
  },
  component: TaskList,
})

function TaskList() {
  const { move, tasks, members, today: currentDate } = Route.useLoaderData()
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
        <AddTaskDialog members={members} />

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

function AddTaskDialog({
  members,
}: {
  members: { id: string; name: string; email: string }[]
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <HydratedButton variant="outline" className="w-full">
          Quest を追加
        </HydratedButton>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Quest を追加</DialogTitle>
        </DialogHeader>
        <TaskForm
          members={members}
          submitLabel="追加する"
          onSubmit={async (input) => {
            await submitCreateTask({ data: input })
            setOpen(false)
            await router.invalidate()
          }}
        />
      </DialogContent>
    </Dialog>
  )
}
