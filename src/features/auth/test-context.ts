import type { Db } from '@/db/client'
import { households, householdMembers, users } from '@/db/schema'
import type { HouseholdContext } from '@/features/auth/household-context'

/**
 * テスト用に Household / User / 所属を作り、Use Case に渡す実行コンテキストを返す。
 * 別 Household からのアクセスを検証したいときは、違う id で2回呼ぶ。
 */
export async function createTestContext(
  db: Db,
  overrides: Partial<{
    householdId: string
    householdName: string
    userId: string
    email: string
    userName: string
  }> = {},
): Promise<HouseholdContext> {
  const {
    householdId = 'h1',
    householdName = 'Our Family',
    userId = 'u1',
    email = 'adult-a@example.com',
    userName = 'Adult A',
  } = overrides

  const [household] = await db
    .insert(households)
    .values({ id: householdId, name: householdName })
    .returning()
  const [user] = await db
    .insert(users)
    .values({ id: userId, email, name: userName })
    .returning()
  await db.insert(householdMembers).values({ householdId, userId })

  return { db, user, household }
}
