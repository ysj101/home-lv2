import { createRemoteJWKSet, jwtVerify } from 'jose'

import { unauthorized } from '@/features/auth/errors'

/**
 * Cloudflare Access が付けるヘッダ。Access を通ったリクエストにのみ存在する。
 * @see https://developers.cloudflare.com/cloudflare-one/identity/authorization-cookie/validating-json/
 */
const ACCESS_JWT_HEADER = 'Cf-Access-Jwt-Assertion'

export type AccessConfig = {
  /** 例: `example.cloudflareaccess.com` */
  teamDomain: string
  /** Access Application の AUD タグ。 */
  aud: string
  /**
   * ローカル開発用のバイパス。値があればこのメールアドレスを認証済みとして扱う。
   * 本番の Worker には設定しないこと。
   */
  devUserEmail?: string
}

/**
 * Team domain ごとの JWKS を使い回す。`createRemoteJWKSet` は取得した鍵を
 * 自前でキャッシュし、未知の kid が来たときだけ再取得するので、
 * アイソレート内で1つ持てばリクエストごとの往復が消える。
 */
const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>()

function getJwks(teamDomain: string) {
  const cached = jwksCache.get(teamDomain)
  if (cached) return cached

  const jwks = createRemoteJWKSet(
    new URL(`https://${teamDomain}/cdn-cgi/access/certs`),
  )
  jwksCache.set(teamDomain, jwks)

  return jwks
}

/** テスト用。JWKS のキャッシュを捨てる。 */
export function clearJwksCache(): void {
  jwksCache.clear()
}

/**
 * `Cf-Access-Jwt-Assertion` を検証し、認証済みメールアドレスを返す。
 *
 * issuer（Team domain）・audience（AUD タグ）・有効期限は jose 側で検証される。
 * 失敗した場合は 401 の HttpError を投げる。
 */
export async function verifyAccessJwt(
  request: Request,
  config: AccessConfig,
): Promise<string> {
  // ローカル開発では Access を通らないので、明示的に設定された場合のみ迂回する。
  if (config.devUserEmail) {
    return config.devUserEmail
  }

  const token = request.headers.get(ACCESS_JWT_HEADER)
  if (!token) {
    throw unauthorized(`${ACCESS_JWT_HEADER} ヘッダがありません。`)
  }

  let payload
  try {
    ;({ payload } = await jwtVerify(token, getJwks(config.teamDomain), {
      issuer: `https://${config.teamDomain}`,
      audience: config.aud,
    }))
  } catch (cause) {
    throw unauthorized(
      `Access JWT の検証に失敗しました: ${cause instanceof Error ? cause.message : String(cause)}`,
    )
  }

  const email = payload.email
  if (typeof email !== 'string' || email.length === 0) {
    throw unauthorized('Access JWT に email クレームがありません。')
  }

  return email
}
