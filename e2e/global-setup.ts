import { execSync } from 'node:child_process'

/**
 * E2E はローカル D1 を共有するので、実行のたびに作り直して同じ初期状態から始める。
 * （Move 未登録 / 標準テンプレート投入済み / 家族2人）
 */
export default function globalSetup() {
  execSync('pnpm db:reset:local', { stdio: 'inherit' })
}
