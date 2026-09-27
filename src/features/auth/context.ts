import { env } from 'cloudflare:workers'
import { getRequest } from '@tanstack/react-start/server'

import { createDb, type Db } from '@/db/client'
import type { User } from '@/db/schema'
import { readAccessConfig } from '@/features/auth/access-config'
import { getCurrentUser } from '@/features/auth/get-current-user'
import { verifyAccessJwt } from '@/features/auth/verify-access-jwt'

/**
 * Server Function から現在ユーザーを取得するための配線。
 *
 * Workers のバインディングとリクエストに触る薄い層なので、ロジックは
 * `verifyAccessJwt` / `getCurrentUser` 側に置き、そちらをテストする。
 */
export type AuthContext = {
  db: Db
  user: User
}

export async function requireUser(): Promise<AuthContext> {
  const db = createDb(env.DB)
  const email = await verifyAccessJwt(getRequest(), readAccessConfig(env))

  return { db, user: await getCurrentUser(db, email) }
}
