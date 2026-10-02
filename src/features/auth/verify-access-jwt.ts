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

let bypassWarned = false

function warnBypassOnce(email: string): void {
  if (bypassWarned) return
  bypassWarned = true

  console.warn(
    `[auth] DEV_USER_EMAIL による認証バイパスが有効です (${email})。本番では設定しないでください。`,
  )
}

/** テスト用。警告済みフラグを戻す。 */
export function resetBypassWarning(): void {
  bypassWarned = false
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
  // 万一これが有効になっていても気づけるよう警告を残すが、毎リクエスト出すと
  // ログが埋まるのでアイソレートごとに1回だけにする。
  if (config.devUserEmail) {
    warnBypassOnce(config.devUserEmail)

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
      // Access が使う署名アルゴリズムに限定する。
      algorithms: ['RS256', 'ES256'],
      // jose は exp が「ある場合のみ」期限を見るので、無期限トークンを
      // 受け入れないよう存在自体を必須にする。
      requiredClaims: ['exp', 'iat'],
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
