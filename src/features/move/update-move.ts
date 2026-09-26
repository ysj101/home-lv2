import { updateMoveById } from '@/db/repositories/move'
import type { Move } from '@/db/schema'
import { notFound } from '@/features/auth/errors'
import type { HouseholdContext } from '@/features/auth/household-context'
import { optionalText, requireDate, requireText } from '@/lib/validation'

export type UpdateMoveInput = {
  name?: string
  /** `YYYY-MM-DD` */
  moveDate?: string
  oldAddress?: string | null
  newAddress?: string | null
}

/**
 * Move を更新する。渡された項目だけを変更する。
 *
 * 引越し日を変えても Task の期限は自動では動かさない。対象を確認してから
 * 一括更新する流れは #20（recalculateTemplateTaskDueDates）で扱う。
 */
export async function updateMove(
  context: HouseholdContext,
  moveId: string,
  input: UpdateMoveInput,
): Promise<Move> {
  const values: Parameters<typeof updateMoveById>[3] = {}

  if (input.name !== undefined) {
    values.name = requireText(input.name, '引越し名')
  }
  if (input.moveDate !== undefined) {
    values.moveDate = requireDate(input.moveDate, '引越し日')
  }
  if (input.oldAddress !== undefined) {
    values.oldAddress = optionalText(input.oldAddress)
  }
  if (input.newAddress !== undefined) {
    values.newAddress = optionalText(input.newAddress)
  }

  const move = await updateMoveById(
    context.db,
    context.household.id,
    moveId,
    values,
  )

  if (!move) {
    throw notFound('引越しが見つかりません。')
  }

  return move
}
