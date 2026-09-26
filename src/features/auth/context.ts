import { env } from 'cloudflare:workers'
import { getRequest } from '@tanstack/react-start/server'

import { createDb } from '@/db/client'
import { readAccessConfig } from '@/features/auth/access-config'
import {
  resolveHouseholdContext,
  type HouseholdContext,
} from '@/features/auth/household-context'
import { verifyAccessJwt } from '@/features/auth/verify-access-jwt'

/**
 * Server Function の入口。Workers のバインディングとリクエストに触る薄い配線層で、
 * ロジックは verifyAccessJwt / resolveHouseholdContext 側に置く。
 *
 * すべての Server Function はまずこれを呼び、返ってきたコンテキスト経由でのみ
 * DB を操作すること。
 */
export async function requireContext(): Promise<HouseholdContext> {
  const db = createDb(env.DB)
  const email = await verifyAccessJwt(getRequest(), readAccessConfig(env))

  return resolveHouseholdContext(db, email)
}
