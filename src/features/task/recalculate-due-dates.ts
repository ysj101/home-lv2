import { and, eq, inArray } from 'drizzle-orm'

import { taskTemplates, tasks, type Task } from '@/db/schema'
import type { HouseholdContext } from '@/features/auth/household-context'
import { requireMove } from '@/features/move/require-move'
import { addDays } from '@/lib/date'

/**
 * 引越し日を変えたときに期限を引き直す（spec §11 UC-07）。
 *
 * MVP では自動更新せず、変更対象を見せて確認してから一括更新する。
 * そのためプレビューと適用を分けている。
 *
 * 対象はテンプレート由来（`source = template`）かつ未完了の Task のみ。
 * 手動追加（`source = manual`）と完了済みには触らない。
 */

export type DueDateChange = {
  taskId: string
  title: string
  currentDueDate: string | null
  nextDueDate: string
}

type TemplateTask = {
  id: string
  title: string
  dueDate: string | null
  offsetDays: number
}

/** 引越し日を基準に、実際に変わる Task だけを抜き出す。 */
export function computeDueDateChanges(
  templateTasks: TemplateTask[],
  moveDate: string,
): DueDateChange[] {
  return templateTasks
    .map((task) => ({
      taskId: task.id,
      title: task.title,
      currentDueDate: task.dueDate,
      nextDueDate: addDays(moveDate, task.offsetDays),
    }))
    .filter((change) => change.currentDueDate !== change.nextDueDate)
}

/** 対象 Task とテンプレートの offset_days を引く。 */
async function findTemplateTasks(
  context: HouseholdContext,
  moveId: string,
): Promise<TemplateTask[]> {
  return context.db
    .select({
      id: tasks.id,
      title: tasks.title,
      dueDate: tasks.dueDate,
      offsetDays: taskTemplates.offsetDays,
    })
    .from(tasks)
    .innerJoin(taskTemplates, eq(taskTemplates.id, tasks.templateId))
    .where(
      and(
        eq(tasks.moveId, moveId),
        eq(tasks.source, 'template'),
        eq(tasks.status, 'todo'),
      ),
    )
}

/**
 * 新しい引越し日にしたときに、どの Task の期限がどう変わるかを返す。
 * DB は更新しない。
 */
export async function previewRecalculation(
  context: HouseholdContext,
  moveId: string,
  newMoveDate: string,
): Promise<DueDateChange[]> {
  // 所属の確認と対象の取得は互いに依存しないので並行して投げる。
  const [, templateTasks] = await Promise.all([
    requireMove(context, moveId),
    findTemplateTasks(context, moveId),
  ])

  return computeDueDateChanges(templateTasks, newMoveDate)
}

/**
 * 現在の引越し日を基準に、対象 Task の期限を一括更新する。
 *
 * 同じ期限になる Task はまとめて1文で更新する（テンプレートの offset は
 * 種類が少ないので、Task 件数ぶんの UPDATE を投げずに済む）。
 */
export async function recalculateTemplateTaskDueDates(
  context: HouseholdContext,
  moveId: string,
): Promise<Task[]> {
  const [move, templateTasks] = await Promise.all([
    requireMove(context, moveId),
    findTemplateTasks(context, moveId),
  ])
  const changes = computeDueDateChanges(templateTasks, move.moveDate)

  if (changes.length === 0) return []

  const idsByDueDate = new Map<string, string[]>()
  for (const change of changes) {
    const ids = idsByDueDate.get(change.nextDueDate) ?? []
    ids.push(change.taskId)
    idsByDueDate.set(change.nextDueDate, ids)
  }

  const updated = await Promise.all(
    Array.from(idsByDueDate, ([dueDate, ids]) =>
      context.db
        .update(tasks)
        .set({ dueDate, updatedAt: new Date() })
        .where(inArray(tasks.id, ids))
        .returning(),
    ),
  )

  return updated.flat()
}
