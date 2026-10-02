import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useState } from 'react'

import { NoMove } from '@/components/empty-state'
import { TaskFilters } from '@/components/task-filters'
import { PageTitle } from '@/components/page-title'
import { TaskForm } from '@/components/task-form'
import { TaskList } from '@/components/task-list'
import { HydratedButton } from '@/components/hydrated'
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
import type { HouseholdMemberSummary } from '@/features/auth/get-household-members'
import { fetchHouseholdMembers } from '@/features/auth/server'
import { fetchTasks, submitCreateTask } from '@/features/task/server'
import {
  validateTaskSearch,
  type TaskSearch,
} from '@/features/task/task-search'
import { today } from '@/lib/date'

export const Route = createFileRoute('/tasks/')({
  validateSearch: validateTaskSearch,
  // 絞り込みが変わったら読み直す。
  loaderDeps: ({ search }: { search: TaskSearch }) => search,
  loader: async ({ deps }) => {
    // tasks / members は move の有無に依存しないので3本まとめて投げる。
    const [move, tasks, members] = await Promise.all([
      fetchMove(),
      fetchTasks({ data: deps }),
      fetchHouseholdMembers(),
    ])

    return { move, tasks, members, today: today() }
  },
  component: TaskListPage,
})

function TaskListPage() {
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

        <TaskList
          tasks={tasks}
          today={currentDate}
          label="Quest 一覧"
          emptyText="条件に合う Quest がありません。"
        />
      </CardContent>
    </Card>
  )
}

function AddTaskDialog({ members }: { members: HouseholdMemberSummary[] }) {
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
