import { and, asc, eq } from 'drizzle-orm'

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

/** sort_order 順の全テンプレート。 */
export async function listTaskTemplates(db: Db): Promise<TaskTemplate[]> {
  return db.select().from(taskTemplates).orderBy(asc(taskTemplates.sortOrder))
}

export async function insertTasks(
  db: Db,
  values: NewTask[],
): Promise<Task[]> {
  if (values.length === 0) return []

  return db.insert(tasks).values(values).returning()
}

/** batch に載せるための insert 文。実行はしない。 */
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

export async function listTasksByMove(db: Db, moveId: string): Promise<Task[]> {
  return db.select().from(tasks).where(eq(tasks.moveId, moveId))
}
