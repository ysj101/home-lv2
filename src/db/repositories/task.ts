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

/**
 * D1 は1文あたりのバインド変数が100個までなので、1文に載せる行数を制限する。
 * Task 1行あたり10個前後のバインドになるため、8行なら確実に収まる。
 * （in-memory SQLite の上限はもっと緩いので、テストだけでは気づけない）
 */
const MAX_ROWS_PER_INSERT = 8

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = []

  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size))
  }

  return chunks
}

export async function insertTasks(db: Db, values: NewTask[]): Promise<Task[]> {
  const inserted = await Promise.all(
    insertTasksStatements(db, values).map((statement) => statement),
  )

  return inserted.flat()
}

/**
 * batch に載せるための insert 文。バインド変数の上限に収まるよう複数文に割る。
 * 空配列なら空配列を返す。
 */
export function insertTasksStatements(db: Db, values: NewTask[]) {
  return chunk(values, MAX_ROWS_PER_INSERT).map((rows) =>
    db.insert(tasks).values(rows).returning(),
  )
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
