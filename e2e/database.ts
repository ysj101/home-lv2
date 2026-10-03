import { execFileSync } from 'node:child_process'

import { getTableName } from 'drizzle-orm'

import {
  householdMembers,
  households,
  moves,
  taskTemplates,
  tasks,
  users,
} from '@/db/schema'
import { DATABASE_NAME } from '@/db/seed/config'

/**
 * 中身を消すテーブル。外部キーの子から先に並べる。
 * テーブルを足したらここにも足すこと（漏れると前回の実行のデータが残る）。
 */
const TABLES = [tasks, moves, taskTemplates, householdMembers, households, users]

/**
 * pnpm のスクリプトを実行する。出力は失敗したときだけ見せる。
 * stdin を渡さないので、wrangler は確認プロンプトを出さずに進む。
 */
function pnpm(args: string[]): void {
  try {
    execFileSync('pnpm', args, { stdio: 'pipe' })
  } catch (cause) {
    const { stdout, stderr } = cause as { stdout?: Buffer; stderr?: Buffer }
    throw new Error(
      `pnpm ${args.join(' ')} に失敗しました。\n${stdout ?? ''}${stderr ?? ''}`,
    )
  }
}

/**
 * ローカル D1 を seed 直後の状態に戻す（Move 未登録 / 標準テンプレート / 家族2人）。
 *
 * dev サーバーを起動したまま呼ぶので、DB ファイルは消さずに中身だけ入れ替える。
 * `.wrangler` ごと消すと、サーバーは開いたままの古いファイルを読み書きし続け、
 * 作り直した DB を見ない。
 */
export function resetDatabase(): void {
  // 初回（.wrangler が無い）はここで DB とテーブルが作られる。
  pnpm(['db:migrate:local'])
  pnpm([
    'exec',
    'wrangler',
    'd1',
    'execute',
    DATABASE_NAME,
    '--local',
    '--yes',
    `--command=${TABLES.map((table) => `DELETE FROM ${getTableName(table)};`).join(' ')}`,
  ])
  pnpm(['db:seed:local'])
}
