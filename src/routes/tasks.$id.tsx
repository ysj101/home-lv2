import { createFileRoute, useNavigate, useRouter } from '@tanstack/react-router'
import { useState } from 'react'

import { HydratedButton } from '@/components/hydrated'
import { PageTitle } from '@/components/page-title'
import { TaskForm } from '@/components/task-form'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { fetchHouseholdMembers } from '@/features/auth/server'
import {
  fetchTask,
  submitDeleteTask,
  submitUpdateTask,
} from '@/features/task/server'
import { useCompleteToggle } from '@/features/task/use-complete-toggle'
import { toDateString, toMonthDay } from '@/lib/date'
import { categoryLabel } from '@/lib/task-category'

export const Route = createFileRoute('/tasks/$id')({
  loader: async ({ params }) => {
    const [task, members] = await Promise.all([
      fetchTask({ data: { id: params.id } }),
      fetchHouseholdMembers(),
    ])

    return { task, members }
  },
  component: TaskDetail,
})

/** 完了・再オープンの切り替え。完了済みなら誰がいつ終えたかを添える。 */
function CompleteToggle({
  task,
}: {
  task: NonNullable<Awaited<ReturnType<typeof fetchTask>>>
}) {
  const { completed, busy, toggle } = useCompleteToggle(task)

  return (
    <div className="space-y-2">
      <HydratedButton
        variant={completed ? 'outline' : 'default'}
        className="w-full"
        disabled={busy}
        onClick={toggle}
      >
        {completed ? '再オープンする' : 'Clear!'}
      </HydratedButton>

      {completed && task.completedAt ? (
        <p className="text-center text-xs text-muted-foreground">
          {toMonthDay(toDateString(task.completedAt))} に
          {task.completedByName ? ` ${task.completedByName} が` : ''}完了
        </p>
      ) : null}
    </div>
  )
}

function TaskDetail() {
  const { task, members } = Route.useLoaderData()
  const router = useRouter()
  const navigate = useNavigate()
  const [deleteOpen, setDeleteOpen] = useState(false)

  if (!task) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          この Quest は見つかりませんでした。
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <PageTitle>{task.title}</PageTitle>
          <CardDescription className="flex flex-wrap items-center gap-2">
            <span>{categoryLabel(task.category)}</span>
            {task.source === 'template' ? (
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                標準 Quest
              </span>
            ) : null}
            <span>
              {task.status === 'completed' ? 'Cleared' : '未完了'}
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-0">
          <CompleteToggle task={task} />
        </CardContent>
        <CardContent>
          <TaskForm
            key={task.id}
            members={members}
            defaultValues={{
              title: task.title,
              description: task.description ?? '',
              category: task.category,
              dueDate: task.dueDate ?? '',
              assigneeId: task.assigneeId,
            }}
            showAssignee={false}
            submitLabel="保存する"
            onSubmit={async (input) => {
              await submitUpdateTask({
                data: {
                  id: task.id,
                  input: {
                    title: input.title,
                    description: input.description,
                    category: input.category,
                    dueDate: input.dueDate,
                  },
                },
              })
              await router.invalidate()
            }}
          />
        </CardContent>
      </Card>

      <HydratedButton
        variant="outline"
        className="w-full text-destructive"
        onClick={() => setDeleteOpen(true)}
      >
        この Quest を削除する
      </HydratedButton>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>この Quest を削除しますか？</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            「{task.title}」を削除します。元に戻せません。
          </p>
          <div className="flex gap-2">
            <HydratedButton
              variant="outline"
              className="flex-1"
              onClick={() => setDeleteOpen(false)}
            >
              やめる
            </HydratedButton>
            <HydratedButton
              variant="destructive"
              className="flex-1"
              onClick={async () => {
                await submitDeleteTask({ data: { id: task.id } })
                await navigate({ to: '/tasks' })
              }}
            >
              削除する
            </HydratedButton>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
