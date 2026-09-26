import type { Db } from '@/db/client'
import type { Household, User } from '@/db/schema'
import { getCurrentHousehold } from '@/features/auth/get-current-household'
import { getCurrentUser } from '@/features/auth/get-current-user'

/**
 * Use Case が受け取る実行コンテキスト。
 *
 * Move / Task の Use Case は必ずこのコンテキスト経由で DB を触り、
 * 自分の `household.id` でスコープした条件を付けること。
 * 生の `Db` を直接受け取る Use Case を作らないこと（spec §25 Data Integrity:
 * 「User が所属する Household 以外のデータへアクセスできない」）。
 */
export type HouseholdContext = {
  db: Db
  user: User
  household: Household
}

/**
 * 認証済みメールアドレスから実行コンテキストを組み立てる。
 * 未登録ユーザーも所属なしユーザーもここで 403 に落ちる。
 */
export async function resolveHouseholdContext(
  db: Db,
  email: string,
): Promise<HouseholdContext> {
  const user = await getCurrentUser(db, email)
  const household = await getCurrentHousehold(db, user.id)

  return { db, user, household }
}
