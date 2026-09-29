import { createServerFn } from '@tanstack/react-start'

import { getHouseholdMembers } from '@/features/auth/get-household-members'
import { requireContext } from '@/features/auth/context'

/**
 * Route から呼ぶ Server Function。
 *
 * Route に業務ロジックを書かないための境界（spec §14, §24 Domain Logic
 * Outside Routes）。どの関数も requireContext() で認証・所属を解決してから
 * Use Case に渡すだけにする。
 */

export const fetchCurrentUser = createServerFn().handler(async () => {
  const { user, household } = await requireContext()

  return { user, household }
})

export const fetchHouseholdMembers = createServerFn().handler(async () =>
  getHouseholdMembers(await requireContext()),
)
