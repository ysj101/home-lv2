import { describe, expect, it } from 'vitest'

import { readAccessConfig } from '@/features/auth/access-config'

describe('readAccessConfig', () => {
  it('Team domain と AUD を読む', () => {
    expect(
      readAccessConfig({
        CF_ACCESS_TEAM_DOMAIN: 'example.cloudflareaccess.com',
        CF_ACCESS_AUD: 'aud-tag',
      }),
    ).toEqual({ teamDomain: 'example.cloudflareaccess.com', aud: 'aud-tag' })
  })

  it('開発ビルドでは DEV_USER_EMAIL をバイパス設定として返す', () => {
    expect(import.meta.env.DEV).toBe(true)
    expect(readAccessConfig({ DEV_USER_EMAIL: 'dev@example.com' })).toEqual({
      teamDomain: '',
      aud: '',
      devUserEmail: 'dev@example.com',
    })
  })

  it('空文字の DEV_USER_EMAIL はバイパスとして扱わない', () => {
    expect(() =>
      readAccessConfig({ DEV_USER_EMAIL: '   ', CF_ACCESS_AUD: 'aud-tag' }),
    ).toThrow(/CF_ACCESS_TEAM_DOMAIN と CF_ACCESS_AUD が未設定/)
  })

  it('DEV_USER_EMAIL があっても Team domain / AUD が揃っていればそちらを使わない', () => {
    // 開発ビルドではバイパスが優先される。本番ビルドでは分岐ごと消えるため
    // 常に Team domain / AUD が使われる（build.test.ts で検証）。
    expect(
      readAccessConfig({
        DEV_USER_EMAIL: 'dev@example.com',
        CF_ACCESS_TEAM_DOMAIN: 'example.cloudflareaccess.com',
        CF_ACCESS_AUD: 'aud-tag',
      }).devUserEmail,
    ).toBe('dev@example.com')
  })

  it('Team domain か AUD が欠けていれば失敗する（fail closed）', () => {
    expect(() => readAccessConfig({})).toThrow(/未設定/)
    expect(() =>
      readAccessConfig({
        CF_ACCESS_TEAM_DOMAIN: 'example.cloudflareaccess.com',
      }),
    ).toThrow(/未設定/)
    expect(() => readAccessConfig({ CF_ACCESS_AUD: 'aud-tag' })).toThrow(
      /未設定/,
    )
  })
})
