import type { AccessConfig } from '@/features/auth/verify-access-jwt'

/** Access の設定に使う環境変数。値は #11 で Zero Trust 側を作ってから入れる。 */
export type AccessEnv = {
  CF_ACCESS_TEAM_DOMAIN?: string
  CF_ACCESS_AUD?: string
  DEV_USER_EMAIL?: string
}

/**
 * 環境変数から Access の設定を読む。
 *
 * `DEV_USER_EMAIL` が設定されていればローカル開発用のバイパスとして扱い、
 * そうでなければ Team domain と AUD の両方を必須にする（fail closed）。
 * 本番の Worker に `DEV_USER_EMAIL` を設定しないこと。
 */
export function readAccessConfig(env: AccessEnv): AccessConfig {
  const devUserEmail = env.DEV_USER_EMAIL?.trim()
  if (devUserEmail) {
    return { teamDomain: '', aud: '', devUserEmail }
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
