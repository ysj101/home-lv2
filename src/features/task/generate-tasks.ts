import type { Db } from '@/db/client'
import { insertTasks, listTaskTemplates } from '@/db/repositories/task'
import type { Move, NewTask, Task, TaskTemplate } from '@/db/schema'
import type { HouseholdContext } from '@/features/auth/household-context'
import { addDays } from '@/lib/date'

/**
 * テンプレートから Task の挿入値を組み立てる（spec §11 UC-02）。
 *
 * `dueDate = moveDate + offsetDays`。DB に触らない純粋関数にして、
 * 期限計算だけを切り離してテストできるようにしている。
 */
export function buildTasksFromTemplates(
  move: Pick<Move, 'id' | 'moveDate'>,
  templates: TaskTemplate[],
): NewTask[] {
  return templates
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((template) => ({
      moveId: move.id,
      title: template.title,
      description: template.description,
      category: template.category,
      dueDate: addDays(move.moveDate, template.offsetDays),
      assigneeId: null,
      status: 'todo' as const,
      source: 'template' as const,
      templateId: template.id,
    }))
}

/**
 * 全テンプレートを読んで Move の Task の挿入値を組み立てる。
 *
 * 挿入までは行わないので、単発でも batch でも同じ組み立てを使える
 * （createMove は batch に載せるためこちらを使う）。
 */
export async function buildMoveTasks(
  db: Db,
  move: Pick<Move, 'id' | 'moveDate'>,
): Promise<NewTask[]> {
  return buildTasksFromTemplates(move, await listTaskTemplates(db))
}

/**
 * 全テンプレートから Move の Task を一括生成する（spec §14）。
 *
 * 対象 Move が現在 Household のものであることは呼び出し側で担保する。
 */
export async function generateTasksFromTemplates(
  context: HouseholdContext,
  move: Pick<Move, 'id' | 'moveDate'>,
): Promise<Task[]> {
  return insertTasks(context.db, await buildMoveTasks(context.db, move))
}
