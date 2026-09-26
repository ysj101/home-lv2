import { and, asc, eq, exists, sql } from 'drizzle-orm'

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
 * Task は Move 経由で Household に属する。単体の Task を読み書きする関数は
 * すべて `householdId` を必須で受け取り、SQL の条件に必ず含める。
 * Use Case 側でスコープを付け忘れても型で気づけるようにするため。
 *
 * 対象が見つからない場合、Use Case 側は 403 ではなく 404 を返すこと。
 * 403 と区別すると、その ID の Task が存在するかどうかが漏れてしまう。
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

/**
 * Household スコープで Task を更新する。
 * 対象が無い（他 Household を含む）場合は null。
 */
export async function updateTaskInHousehold(
  db: Db,
  householdId: string,
  taskId: string,
  values: Partial<Omit<NewTask, 'id' | 'moveId'>>,
): Promise<Task | null> {
  const [task] = await db
    .update(tasks)
    .set({ ...values, updatedAt: new Date() })
    .where(and(eq(tasks.id, taskId), belongsToHousehold(db, householdId)))
    .returning()

  return task ?? null
}

/**
 * Household スコープで Task を削除する。
 * 削除できたら true、対象が無ければ false。
 */
export async function deleteTaskInHousehold(
  db: Db,
  householdId: string,
  taskId: string,
): Promise<boolean> {
  const deleted = await db
    .delete(tasks)
    .where(and(eq(tasks.id, taskId), belongsToHousehold(db, householdId)))
    .returning({ id: tasks.id })

  return deleted.length > 0
}
