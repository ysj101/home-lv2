import { execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import {
  buildHouseholdSeedStatements,
  type HouseholdSeedConfig,
} from '@/db/seed/household'

const DATABASE_NAME = 'home-lv2-db'

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

function readHouseholdSeedConfig(): HouseholdSeedConfig {
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

/**
 * seed 用 SQL を組み立てて wrangler 経由で D1 に流す。
 * 各 seed は冪等なので、何度実行しても件数は増えない。
 */
function main() {
  const target = process.argv.includes('--remote') ? '--remote' : '--local'

  const statements = [
    ...buildHouseholdSeedStatements(readHouseholdSeedConfig()),
  ]

  const file = join(mkdtempSync(join(tmpdir(), 'home-lv2-seed-')), 'seed.sql')
  writeFileSync(file, `${statements.join('\n')}\n`)

  execFileSync(
    'wrangler',
    ['d1', 'execute', DATABASE_NAME, target, `--file=${file}`, '--yes'],
    { stdio: 'inherit' },
  )
}

main()
