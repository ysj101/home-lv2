/**
 * Server Function から投げる HTTP ステータス付きのエラー。
 * 認証・認可の失敗をルート側で 401 / 403 に落とすために使う。
 */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'HttpError'
  }
}

/** 認証されていない（JWT が無い・不正・期限切れ）。 */
export function unauthorized(message: string): HttpError {
  return new HttpError(401, message)
}

/** 認証は済んでいるが、このアプリのデータにアクセスする権限がない。 */
export function forbidden(message: string): HttpError {
  return new HttpError(403, message)
}

/** 対象が存在しない、または自分の Household のものではない。 */
export function notFound(message: string): HttpError {
  return new HttpError(404, message)
}

/** 入力が不正。 */
export function badRequest(message: string): HttpError {
  return new HttpError(400, message)
}
