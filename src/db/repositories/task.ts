import { and, asc, eq, exists, inArray, sql } from 'drizzle-orm'

import type { Db } from '@/db/client'
import {
  moves,
  taskTemplates,
  tasks,
  type NewTask,
  type Task,
  type TaskTemplate,
} from '@/db/schema'

/**
 * tasks テーブルへのアクセス。
 *
 * Task は Move 経由で Household に属するので、単体の Task を引く関数は
 * `householdId` を受け取り `moves` との JOIN で絞り込む。
 */

/** その Task が指定 Household の Move に属するか、という条件。 */
function belongsToHousehold(db: Db, householdId: string) {
  return exists(
    db
      .select({ one: sql`1` })
      .from(moves)
      .where(
        and(eq(moves.id, tasks.moveId), eq(moves.householdId, householdId)),
      ),
  )
}

/**
 * テンプレート由来かつ未完了の Task と、そのテンプレートの offset_days を引く。
 * 期限の再計算（#20）で使う。
 */
export async function listTemplateTasksInHousehold(
  db: Db,
  householdId: string,
  moveId: string,
): Promise<
  { id: string; title: string; dueDate: string | null; offsetDays: number }[]
> {
  return db
    .select({
      id: tasks.id,
      title: tasks.title,
      dueDate: tasks.dueDate,
      offsetDays: taskTemplates.offsetDays,
    })
    .from(tasks)
    .innerJoin(taskTemplates, eq(taskTemplates.id, tasks.templateId))
    .innerJoin(moves, eq(moves.id, tasks.moveId))
    .where(
      and(
        eq(tasks.moveId, moveId),
        eq(moves.householdId, householdId),
        eq(tasks.source, 'template'),
        eq(tasks.status, 'todo'),
      ),
    )
}

/** Household スコープで複数 Task の期限をまとめて更新する。 */
export async function updateTaskDueDatesInHousehold(
  db: Db,
  householdId: string,
  taskIds: string[],
  dueDate: string,
): Promise<Task[]> {
  return db
    .update(tasks)
    .set({ dueDate, updatedAt: new Date() })
    .where(
      and(inArray(tasks.id, taskIds), belongsToHousehold(db, householdId)),
    )
    .returning()
}

/** sort_order 順の全テンプレート。 */
export async function listTaskTemplates(db: Db): Promise<TaskTemplate[]> {
  return db.select().from(taskTemplates).orderBy(asc(taskTemplates.sortOrder))
}

export async function insertTasks(db: Db, values: NewTask[]): Promise<Task[]> {
  if (values.length === 0) return []

  return insertTasksStatement(db, values)
}

/** batch に載せるための insert 文。空配列は渡せない。 */
export function insertTasksStatement(db: Db, values: NewTask[]) {
  return db.insert(tasks).values(values).returning()
}

/** Household スコープで Task を1件引く。他 Household のものは null。 */
export async function findTaskInHousehold(
  db: Db,
  householdId: string,
  taskId: string,
): Promise<Task | null> {
  const [row] = await db
    .select({ task: tasks })
    .from(tasks)
    .innerJoin(moves, eq(moves.id, tasks.moveId))
    .where(and(eq(tasks.id, taskId), eq(moves.householdId, householdId)))
    .limit(1)

  return row?.task ?? null
}

