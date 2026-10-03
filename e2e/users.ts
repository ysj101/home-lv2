import { loadDevVars, readHouseholdSeedConfig } from '@/db/seed/config'
import type { AdultSeed } from '@/db/seed/household'
import { DEV_USER_EMAIL_HEADER } from '@/features/auth/verify-access-jwt'

// seed と同じ設定元（環境変数 → .dev.vars）から家族2人を読む。
loadDevVars()

export const [ADULT_A, ADULT_B] = readHouseholdSeedConfig().adults

/**
 * そのユーザーとしてリクエストするためのヘッダ。
 * dev サーバーの DEV_USER_EMAIL をリクエストごとに差し替える。
 */
export function asUser(user: AdultSeed): Record<string, string> {
  return { [DEV_USER_EMAIL_HEADER]: user.email }
}
