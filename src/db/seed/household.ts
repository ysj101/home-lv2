import { quote } from '@/db/seed/sql'

/**
 * MVP では Household は1件のみ（docs/spec.md §8）。
 * 冪等に seed するため、採番せず固定 ID を使う。
 */
export const MVP_HOUSEHOLD_ID = '3f1b0c4a-6d2e-4a53-9c7f-1b6d5e2a8c40'

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
 * 何度実行しても件数が増えないよう、すべて `ON CONFLICT ... DO NOTHING` にする。
 * users は `email` が unique なので、既存ユーザーがいれば ID は変わらない。
 * household_members はその既存 ID を SELECT で引き直して紐付ける。
 */
export function buildHouseholdSeedStatements(
  config: HouseholdSeedConfig,
): string[] {
  const householdId = quote(MVP_HOUSEHOLD_ID)

  const statements = [
    `INSERT INTO households (id, name) VALUES (${householdId}, ${quote(config.householdName)}) ON CONFLICT(id) DO NOTHING;`,
  ]

  for (const adult of config.adults) {
    const email = quote(adult.email)
    statements.push(
      `INSERT INTO users (id, email, name) VALUES (${quote(crypto.randomUUID())}, ${email}, ${quote(adult.name)}) ON CONFLICT(email) DO NOTHING;`,
      `INSERT INTO household_members (household_id, user_id, role) SELECT ${householdId}, id, 'member' FROM users WHERE email = ${email} ON CONFLICT(household_id, user_id) DO NOTHING;`,
    )
  }

  return statements
}
