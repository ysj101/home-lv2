import { eq } from 'drizzle-orm'

import type { Db } from '@/db/client'
import { users, type User } from '@/db/schema'
import { forbidden } from '@/features/auth/errors'

/**
 * 認証済みメールアドレスからアプリ内 User を解決する。
 *
 * Cloudflare Access を通っていても、`users` に登録が無ければ拒否する。
 * Access のポリシー（誰がログインできるか）とアプリの登録（誰がデータを持つか）
 * を二重の関門として扱うため（spec §5 / §25 Security）。
 */
export async function getCurrentUser(db: Db, email: string): Promise<User> {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1)

  if (!user) {
    throw forbidden(
      `${email} はこのアプリに登録されていません。seed で users に登録してください。`,
    )
  }

  return user
}
