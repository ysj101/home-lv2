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
 * 全テンプレートから Move の Task を一括生成する。
 *
 * 対象 Move が現在 Household のものであることは呼び出し側で担保する
 * （#19 では作成直後の Move、それ以外は Household スコープで引いた Move）。
 */
export async function generateTasksFromTemplates(
  context: HouseholdContext,
  move: Pick<Move, 'id' | 'moveDate'>,
): Promise<Task[]> {
  const templates = await listTaskTemplates(context.db)

  return insertTasks(context.db, buildTasksFromTemplates(move, templates))
}
