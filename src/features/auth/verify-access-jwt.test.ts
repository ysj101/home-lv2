import { SignJWT, exportJWK, generateKeyPair } from 'jose'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { HttpError } from '@/features/auth/errors'
import {
  clearJwksCache,
  verifyAccessJwt,
} from '@/features/auth/verify-access-jwt'

const TEAM_DOMAIN = 'example.cloudflareaccess.com'
const AUD = 'aud-tag-1234567890abcdef'
const EMAIL = 'adult-a@example.com'

const config = { teamDomain: TEAM_DOMAIN, aud: AUD }

let privateKey: CryptoKey
let jwks: { keys: unknown[] }

beforeAll(async () => {
  const pair = await generateKeyPair('RS256', { extractable: true })
  privateKey = pair.privateKey
  jwks = { keys: [{ ...(await exportJWK(pair.publicKey)), alg: 'RS256', kid: 'test-key' }] }
})

afterEach(() => {
  vi.unstubAllGlobals()
  clearJwksCache()
})

/** Cloudflare の JWKS エンドポイントを模した fetch を仕込む。 */
function stubJwksFetch() {
  const fetchMock = vi.fn(async () => Response.json(jwks))
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

async function signToken(
  claims: Record<string, unknown> = {},
  { audience = AUD, issuer = `https://${TEAM_DOMAIN}`, expiresIn = '1h' } = {},
) {
  return new SignJWT({ email: EMAIL, ...claims })
    .setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
    .setIssuedAt()
    .setIssuer(issuer)
    .setAudience(audience)
    .setExpirationTime(expiresIn)
    .sign(privateKey)
}

function requestWithToken(token?: string) {
  return new Request('https://home-lv2.example.com/', {
    headers: token ? { 'Cf-Access-Jwt-Assertion': token } : {},
  })
}

describe('verifyAccessJwt', () => {
  it('有効な JWT からメールアドレスを取得できる', async () => {
    stubJwksFetch()

    await expect(
      verifyAccessJwt(requestWithToken(await signToken()), config),
    ).resolves.toBe(EMAIL)
  })

  it('ヘッダが無ければ 401', async () => {
    stubJwksFetch()

    await expect(verifyAccessJwt(requestWithToken(), config)).rejects.toThrow(
      /ヘッダがありません/,
    )
    await expect(
      verifyAccessJwt(requestWithToken(), config),
    ).rejects.toMatchObject({ status: 401 })
  })

  it('署名が不正なら 401', async () => {
    stubJwksFetch()
    const token = `${await signToken()}tampered`

    await expect(
      verifyAccessJwt(requestWithToken(token), config),
    ).rejects.toMatchObject({ status: 401 })
  })

  it('AUD が一致しなければ 401', async () => {
    stubJwksFetch()
    const token = await signToken({}, { audience: 'other-aud' })

    await expect(
      verifyAccessJwt(requestWithToken(token), config),
    ).rejects.toMatchObject({ status: 401 })
  })

  it('issuer が一致しなければ 401', async () => {
    stubJwksFetch()
    const token = await signToken({}, { issuer: 'https://evil.example.com' })

    await expect(
      verifyAccessJwt(requestWithToken(token), config),
    ).rejects.toMatchObject({ status: 401 })
  })

  it('有効期限が切れていれば 401', async () => {
    stubJwksFetch()
    const token = await signToken({}, { expiresIn: '-1h' })

    await expect(
      verifyAccessJwt(requestWithToken(token), config),
    ).rejects.toMatchObject({ status: 401 })
  })

  it('email クレームが無ければ 401', async () => {
    stubJwksFetch()
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
      .setIssuedAt()
      .setIssuer(`https://${TEAM_DOMAIN}`)
      .setAudience(AUD)
      .setExpirationTime('1h')
      .sign(privateKey)

    await expect(
      verifyAccessJwt(requestWithToken(token), config),
    ).rejects.toThrow(/email クレームがありません/)
  })

  it('投げるのは status 付きの HttpError', async () => {
    stubJwksFetch()

    await expect(
      verifyAccessJwt(requestWithToken(), config),
    ).rejects.toBeInstanceOf(HttpError)
  })

  it('JWKS はアイソレート内でキャッシュされ、2回目は取りに行かない', async () => {
    const fetchMock = stubJwksFetch()
    const request = requestWithToken(await signToken())

    await verifyAccessJwt(request, config)
    await verifyAccessJwt(request, config)

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('devUserEmail が設定されていれば JWT を見ずにそのメールを返す', async () => {
    const fetchMock = stubJwksFetch()

    await expect(
      verifyAccessJwt(requestWithToken(), {
        ...config,
        devUserEmail: 'dev@example.com',
      }),
    ).resolves.toBe('dev@example.com')
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
