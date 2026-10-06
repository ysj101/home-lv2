import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useState } from 'react'

import { AssigneeSelect } from '@/components/assignee-select'
import { Field } from '@/components/field'
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

type Router = ReturnType<typeof useRouter>

/**
 * 書き込みのあとに画面を移る。
 *
 * 前後でルーターのキャッシュを捨てる。残っていると、移った先や後で開き直した画面が
 * 書き込み前の内容を表示してから読み直す（staleReloadMode の既定が background のため）。
 */
async function leaveAfterMutation(
  router: Router,
  go: () => Promise<void>,
): Promise<void> {
  router.clearCache()
  await go()
  router.clearCache()
}

/**
 * 開く前の画面（絞り込み付きの一覧や Dashboard）に戻る。URL を直接開いたときは
 * 戻り先が無いので一覧へ。どちらも読み込みが終わるまで待つ（待たないと保存ボタンが
 * 先に押せる状態に戻り、二重に保存できてしまう）。
 */
function goBack(router: Router): Promise<void> {
  if (!router.history.canGoBack()) return router.navigate({ to: '/tasks' })

  return new Promise((resolve) => {
    const unsubscribe = router.subscribe('onResolved', () => {
      unsubscribe()
      resolve()
    })
    router.history.back()
  })
}

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
        <CardContent className="space-y-5 pb-0">
          <CompleteToggle task={task} />

          <Field id="assignee" label="担当">
            <AssigneeSelect
              taskId={task.id}
              assigneeId={task.assigneeId}
              members={members}
            />
          </Field>
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
              await leaveAfterMutation(router, () => goBack(router))
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
                await leaveAfterMutation(router, () =>
                  router.navigate({ to: '/tasks' }),
                )
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
