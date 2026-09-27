import type { HouseholdContext } from '@/features/auth/household-context'
import { insertMove } from '@/db/repositories/move'
import type { Move } from '@/db/schema'
import { optionalText, requireDate, requireText } from '@/lib/validation'

export type CreateMoveInput = {
  name: string
  /** `YYYY-MM-DD` */
  moveDate: string
  oldAddress?: string | null
  newAddress?: string | null
}

/**
 * 引越しを登録する（spec §11 UC-01）。
 * Household は現在ユーザーから解決するので入力に含めない。
 *
 * 標準 TODO の自動生成は #19 でここに繋ぎ込む。
 */
export async function createMove(
  context: HouseholdContext,
  input: CreateMoveInput,
): Promise<Move> {
  return insertMove(context.db, {
    householdId: context.household.id,
    name: requireText(input.name, '引越し名'),
    moveDate: requireDate(input.moveDate, '引越し日'),
    oldAddress: optionalText(input.oldAddress),
    newAddress: optionalText(input.newAddress),
  })
}
