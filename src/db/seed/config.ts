import type { HouseholdSeedConfig } from '@/db/seed/household'

/**
 * seed の入力は環境変数から読む。
 * 家族のメールアドレスは個人情報なのでリポジトリにはハードコードしない
 * （ローカルは `.dev.vars` などに置き、本番は CI のシークレットから渡す）。
 */
function requireEnv(key: string): string {
  const value = process.env[key]
  if (!value) {
    throw new Error(
      `環境変数 ${key} が未設定です。seed に必要な値を設定してください。`,
    )
  }
  return value
}

export function readHouseholdSeedConfig(): HouseholdSeedConfig {
  return {
    householdName: process.env.SEED_HOUSEHOLD_NAME ?? 'Our Family',
    adults: [
      {
        email: requireEnv('SEED_ADULT_A_EMAIL'),
        name: process.env.SEED_ADULT_A_NAME ?? 'Adult A',
      },
      {
        email: requireEnv('SEED_ADULT_B_EMAIL'),
        name: process.env.SEED_ADULT_B_NAME ?? 'Adult B',
      },
    ],
  }
}
