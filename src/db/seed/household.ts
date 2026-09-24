import { getTableName } from 'drizzle-orm'

import { households, householdMembers, users } from '@/db/schema'
import { buildInsertStatement, quote, raw } from '@/db/seed/sql'

/**
 * MVP では Household は1件のみ（docs/spec.md §8）。
 * 冪等に seed するため採番せず固定 ID を使う。
 *
 * この値はあくまで seed の内部都合。アプリ側は Household を DB から解決すること
 * （#15 の Household 解決ヘルパ）で、この定数に依存しない。
 */
const MVP_HOUSEHOLD_ID = '3f1b0c4a-6d2e-4a53-9c7f-1b6d5e2a8c40'

export type AdultSeed = {
  email: string
  name: string
}

export type HouseholdSeedConfig = {
  householdName: string
  adults: AdultSeed[]
}

/**
 * Household と Adult ユーザー、その所属を投入する SQL を組み立てる。
 *
 * 家族の情報は運用中にアプリ側で変更しうるので、競合時は既存行に触らない。
 * users は `email` が unique なので再実行しても ID は変わらず、
 * household_members はその ID を email から引き直して紐付ける。
 */
export function buildHouseholdSeedStatements(
  config: HouseholdSeedConfig,
): string[] {
  const statements = [
    buildInsertStatement(
      households,
      { id: MVP_HOUSEHOLD_ID, name: config.householdName },
      { target: ['id'], action: 'nothing' },
    ),
  ]

  for (const adult of config.adults) {
    statements.push(
      buildInsertStatement(
        users,
        { id: crypto.randomUUID(), email: adult.email, name: adult.name },
        { target: ['email'], action: 'nothing' },
      ),
      buildInsertStatement(
        householdMembers,
        {
          householdId: MVP_HOUSEHOLD_ID,
          userId: raw(
            `(SELECT id FROM ${getTableName(users)} WHERE email = ${quote(adult.email)})`,
          ),
          role: 'member',
        },
        { target: ['householdId', 'userId'], action: 'nothing' },
      ),
    )
  }

  return statements
}
