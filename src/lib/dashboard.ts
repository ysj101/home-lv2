import { daysBetween } from '@/lib/date'

/**
 * Dashboard の集計（docs/spec.md §13）。
 *
 * すべて純粋関数で、「今日」は必ず引数で受け取る。Workers のリクエストごとに
 * 時刻が変わるのと、境界値をテストできるようにするため。
 */

/** 集計に必要な Task の最小形。DB の行でも UI の行でも渡せる。 */
export type DashboardTask = {
  status: 'todo' | 'completed'
  /** `YYYY-MM-DD`。期限なしは null。 */
  dueDate: string | null
}

/** 引越しまでの残り日数。当日なら 0、過ぎていれば負の値。 */
export function daysUntil(moveDate: string, today: string): number {
  return daysBetween(today, moveDate)
}

/** 完了率（0〜1）。Task が0件なら 0 を返し、NaN にしない。 */
export function progress(tasks: DashboardTask[]): number {
  if (tasks.length === 0) return 0

  const completed = tasks.filter((task) => task.status === 'completed').length

  return completed / tasks.length
}

/** 完了率の百分率表示（0〜100 の整数）。 */
export function progressPercent(tasks: DashboardTask[]): number {
  return Math.round(progress(tasks) * 100)
}

/** 期限超過。期限なしと完了済みは対象外。 */
export function isOverdue(task: DashboardTask, today: string): boolean {
  if (task.status === 'completed' || task.dueDate === null) return false

  return task.dueDate < today
}

/** 今日が期限。完了済みは対象外。 */
export function isDueToday(task: DashboardTask, today: string): boolean {
  if (task.status === 'completed' || task.dueDate === null) return false

  return task.dueDate === today
}

/** 今日から7日以内が期限（当日と7日後を含む）。完了済みは対象外。 */
export function isUpcoming(task: DashboardTask, today: string): boolean {
  if (task.status === 'completed' || task.dueDate === null) return false

  const days = daysBetween(today, task.dueDate)

  return days >= 0 && days <= 7
}

/** Dashboard 上部に出すサマリー（§12.1）。 */
export type DashboardSummary = {
  total: number
  completed: number
  remaining: number
  overdue: number
  progressPercent: number
}

export function summarize(
  tasks: DashboardTask[],
  today: string,
): DashboardSummary {
  const completed = tasks.filter((task) => task.status === 'completed').length

  return {
    total: tasks.length,
    completed,
    remaining: tasks.length - completed,
    overdue: tasks.filter((task) => isOverdue(task, today)).length,
    progressPercent: progressPercent(tasks),
  }
}
