import { createServerFn } from '@tanstack/react-start'

import { requireContext } from '@/features/auth/context'
import { createMove, type CreateMoveInput } from '@/features/move/create-move'
import { getMove } from '@/features/move/get-move'
import { updateMove, type UpdateMoveInput } from '@/features/move/update-move'

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
