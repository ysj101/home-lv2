import { insertMoveStatement } from '@/db/repositories/move'
import { insertTasksStatement, listTaskTemplates } from '@/db/repositories/task'
import type { Move, Task } from '@/db/schema'
import type { HouseholdContext } from '@/features/auth/household-context'
import { buildTasksFromTemplates } from '@/features/task/generate-tasks'
import { optionalText, requireDate, requireText } from '@/lib/validation'

export type CreateMoveInput = {
  name: string
  /** `YYYY-MM-DD` */
  moveDate: string
  oldAddress?: string | null
  newAddress?: string | null
}

export type CreateMoveResult = {
  move: Move
  tasks: Task[]
}

/**
 * 引越しを登録し、標準 TODO をまとめて生成する（spec §11 UC-01 / UC-02）。
 *
 * Move の作成と Task の挿入は D1 の batch で1つのトランザクションにする。
 * 途中で失敗した場合、Task の無い Move だけが残るような状態を作らないため。
 */
export async function createMove(
  context: HouseholdContext,
  input: CreateMoveInput,
): Promise<CreateMoveResult> {
  const values = {
    householdId: context.household.id,
    name: requireText(input.name, '引越し名'),
    moveDate: requireDate(input.moveDate, '引越し日'),
    oldAddress: optionalText(input.oldAddress),
    newAddress: optionalText(input.newAddress),
    // batch では作成後の ID を受け取ってから Task を組み立てられないので、
    // ここで採番して Task の move_id にも使う。
    id: crypto.randomUUID(),
  }

  const templates = await listTaskTemplates(context.db)
  const taskValues = buildTasksFromTemplates(
    { id: values.id, moveDate: values.moveDate },
    templates,
  )

  if (taskValues.length === 0) {
    const [move] = await insertMoveStatement(context.db, values)

    return { move, tasks: [] }
  }

  const [createdMoves, createdTasks] = await context.db.batch([
    insertMoveStatement(context.db, values),
    insertTasksStatement(context.db, taskValues),
  ])

  return { move: createdMoves[0], tasks: createdTasks }
}
