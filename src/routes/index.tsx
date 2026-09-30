import { createFileRoute } from '@tanstack/react-router'

import { NoMove } from '@/components/empty-state'
import { PageTitle } from '@/components/page-title'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from '@/components/ui/card'
import { TaskSection } from '@/components/task-section'
import { fetchMove } from '@/features/move/server'
import { fetchTasks } from '@/features/task/server'
import {
  daysUntil,
  isDueToday,
  isOverdue,
  isUpcoming,
  summarize,
} from '@/lib/dashboard'
import { today } from '@/lib/date'

export const Route = createFileRoute('/')({
  loader: async () => {
    const [move, tasks] = await Promise.all([fetchMove(), fetchTasks()])

    return { move, tasks, today: today() }
  },
  component: Dashboard,
})

function Dashboard() {
  const { move, tasks, today: currentDate } = Route.useLoaderData()

  if (!move) {
    return (
      <NoMove description="まだ引越しが登録されていません。引越し日を決めるところから始めましょう。" />
    )
  }

  const remainingDays = daysUntil(move.moveDate, currentDate)
  const summary = summarize(tasks, currentDate)

  const dueToday = tasks.filter((task) => isDueToday(task, currentDate))
  const overdue = tasks.filter((task) => isOverdue(task, currentDate))
  // 今週は当日を含む7日以内。今日ぶんは別枠に出すので除く。
  const thisWeek = tasks.filter(
    (task) => isUpcoming(task, currentDate) && !isDueToday(task, currentDate),
  )
  const recentlyCleared = tasks
    .filter((task) => task.status === 'completed' && task.completedAt)
    .sort((a, b) => b.completedAt!.getTime() - a.completedAt!.getTime())

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardDescription>Main Quest</CardDescription>
          <PageTitle>{move.name}</PageTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          <Countdown days={remainingDays} moveDate={move.moveDate} />
          <LevelProgress percent={summary.progressPercent} />
          <Counts summary={summary} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-6">
          <TaskSection
            title="期限超過"
            tasks={overdue}
            today={currentDate}
            seeAll={{ status: 'overdue' }}
            emptyText="期限を過ぎた Quest はありません。"
          />
          <TaskSection
            title="今日やること"
            tasks={dueToday}
            today={currentDate}
            emptyText="今日が期限の Quest はありません。"
          />
          <TaskSection
            title="今週やること"
            tasks={thisWeek}
            today={currentDate}
            seeAll={{ status: 'todo' }}
            emptyText="7日以内が期限の Quest はありません。"
          />
          <TaskSection
            title="最近完了した Quest"
            tasks={recentlyCleared}
            today={currentDate}
            seeAll={{ status: 'completed' }}
            emptyText="まだ完了した Quest はありません。"
          />
        </CardContent>
      </Card>
    </div>
  )
}

function Countdown({ days, moveDate }: { days: number; moveDate: string }) {
  return (
    <section className="text-center">
      <p className="text-xs text-muted-foreground">引越しまで</p>
      <p className="mt-1 text-3xl font-semibold tabular-nums">
        {days > 0 ? (
          <>
            あと {days} <span className="text-base font-normal">日</span>
          </>
        ) : days === 0 ? (
          '今日'
        ) : (
          <>
            {-days} <span className="text-base font-normal">日経過</span>
          </>
        )}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{moveDate}</p>
    </section>
  )
}

function LevelProgress({ percent }: { percent: number }) {
  return (
    <section aria-label="Level Progress">
      <div className="flex items-baseline justify-between">
        <span className="text-xs text-muted-foreground">Level Progress</span>
        <span className="text-sm font-medium tabular-nums">{percent}%</span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="進捗率"
        className="mt-2 h-2 overflow-hidden rounded-full bg-muted"
      >
        <div
          className="h-full rounded-full bg-primary transition-[width]"
          style={{ width: `${percent}%` }}
        />
      </div>
    </section>
  )
}

function Counts({
  summary,
}: {
  summary: { completed: number; remaining: number; overdue: number }
}) {
  const items = [
    { label: 'Cleared', value: summary.completed, tone: '' },
    { label: 'Remaining', value: summary.remaining, tone: '' },
    {
      label: 'Overdue',
      value: summary.overdue,
      tone: summary.overdue > 0 ? 'text-destructive' : '',
    },
  ]

  return (
    <section>
      <ul className="grid grid-cols-3 gap-2 text-center">
        {items.map((item) => (
          <li key={item.label} className="rounded-lg bg-muted/50 py-3">
            <p className={`text-xl font-semibold tabular-nums ${item.tone}`}>
              {item.value}
            </p>
            <p className="text-xs text-muted-foreground">{item.label}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}
