import { createServerFn } from '@tanstack/react-start'

import { requireContext } from '@/features/auth/context'
import { createMove, type CreateMoveInput } from '@/features/move/create-move'
import { getMove } from '@/features/move/get-move'
import { updateMove, type UpdateMoveInput } from '@/features/move/update-move'
import {
  previewRecalculation,
  recalculateTemplateTaskDueDates,
} from '@/features/task/recalculate-due-dates'

/** Route から呼ぶ Move の Server Function。 */

export const fetchMove = createServerFn().handler(async () =>
  getMove(await requireContext()),
)

export const submitCreateMove = createServerFn({ method: 'POST' })
  .validator((data: CreateMoveInput) => data)
  .handler(async ({ data }) => createMove(await requireContext(), data))

export const submitUpdateMove = createServerFn({ method: 'POST' })
  .validator((data: { moveId: string; input: UpdateMoveInput }) => data)
  .handler(async ({ data }) =>
    updateMove(await requireContext(), data.moveId, data.input),
  )

/** 引越し日を変えたときに期限が変わる Task を返す。DB は更新しない。 */
export const fetchRecalculationPreview = createServerFn()
  .validator((data: { moveId: string; newMoveDate: string }) => data)
  .handler(async ({ data }) =>
    previewRecalculation(await requireContext(), data.moveId, data.newMoveDate),
  )

/** 現在の引越し日を基準に、対象 Task の期限を一括更新する。 */
export const submitRecalculation = createServerFn({ method: 'POST' })
  .validator((data: { moveId: string }) => data)
  .handler(async ({ data }) =>
    recalculateTemplateTaskDueDates(await requireContext(), data.moveId),
  )
