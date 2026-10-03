import { execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import {
  DATABASE_NAME,
  loadDevVars,
  readHouseholdSeedConfig,
} from '@/db/seed/config'
import { buildHouseholdSeedStatements } from '@/db/seed/household'
import { buildTaskTemplateSeedStatements } from '@/db/seed/task-templates'

/**
 * seed 用 SQL を組み立てて wrangler 経由で D1 に流す。
 * 各 seed は冪等なので、何度実行しても件数は増えない。
 */
function main() {
  const target = process.argv.includes('--remote') ? '--remote' : '--local'

  // 本番に .dev.vars の example アドレスを入れないよう、remote は環境変数だけを使う。
  // 足りなければ readHouseholdSeedConfig() が未設定のキーを挙げて止まる。
  if (target === '--local') loadDevVars()

  const statements = [
    ...buildHouseholdSeedStatements(readHouseholdSeedConfig()),
    ...buildTaskTemplateSeedStatements(),
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
