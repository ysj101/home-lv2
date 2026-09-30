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
 * 1リクエストで解決したコンテキストを使い回す。
 *
 * 1つの画面が複数の Server Function を呼ぶため（root の現在ユーザー取得 +
 * 各ルートの loader）、そのたびに JWT 検証と users / household_members の
 * 2クエリをやり直していた。Request オブジェクトをキーにすれば、
 * リクエストが終われば一緒に回収される。
 */
const perRequest = new WeakMap<Request, Promise<HouseholdContext>>()

async function resolve(request: Request): Promise<HouseholdContext> {
  const db = createDb(env.DB)
  const email = await verifyAccessJwt(request, readAccessConfig(env))

  return resolveHouseholdContext(db, email)
}

/**
 * Server Function の入口。Workers のバインディングとリクエストに触る薄い配線層で、
 * ロジックは verifyAccessJwt / resolveHouseholdContext 側に置く。
 *
 * すべての Server Function はまずこれを呼び、返ってきたコンテキスト経由でのみ
 * DB を操作すること。
 */
export function requireContext(): Promise<HouseholdContext> {
  const request = getRequest()
  const cached = perRequest.get(request)
  if (cached) return cached

  const context = resolve(request)
  perRequest.set(request, context)

  return context
}
