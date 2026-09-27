import type { AccessConfig } from '@/features/auth/verify-access-jwt'

/** Access の設定に使う環境変数。値は #11 で Zero Trust 側を作ってから入れる。 */
export type AccessEnv = {
  CF_ACCESS_TEAM_DOMAIN?: string
  CF_ACCESS_AUD?: string
  /** ローカル開発専用。`.dev.vars` に置く。本番ビルドでは読まれない。 */
  DEV_USER_EMAIL?: string
}

/**
 * 環境変数から Access の設定を読む。
 *
 * Team domain と AUD の両方が揃わない限り必ず失敗する（fail closed）。
 */
export function readAccessConfig(env: AccessEnv): AccessConfig {
  // 開発ビルドでのみ評価される。Vite が本番ビルドで import.meta.env.DEV を
  // false に畳むため、このブロックごとデプロイ物から消える。設定値の入れ間違いで
  // 本番の認証が無効になることがないよう、値ではなくビルドで遮断する。
  if (import.meta.env.DEV) {
    const devUserEmail = env.DEV_USER_EMAIL?.trim()

    if (devUserEmail) {
      return { teamDomain: '', aud: '', devUserEmail }
    }
  }

  const teamDomain = env.CF_ACCESS_TEAM_DOMAIN?.trim()
  const aud = env.CF_ACCESS_AUD?.trim()

  if (!teamDomain || !aud) {
    throw new Error(
      'CF_ACCESS_TEAM_DOMAIN と CF_ACCESS_AUD が未設定です。#11 で Cloudflare Access を設定し、wrangler.jsonc / .dev.vars に値を入れてください。',
    )
  }

  return { teamDomain, aud }
}
