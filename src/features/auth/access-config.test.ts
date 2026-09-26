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

  it('DEV_USER_EMAIL があればバイパス設定を返す', () => {
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

  it('Team domain か AUD が欠けていれば失敗する（fail closed）', () => {
    expect(() => readAccessConfig({})).toThrow(/未設定/)
    expect(() =>
      readAccessConfig({ CF_ACCESS_TEAM_DOMAIN: 'example.cloudflareaccess.com' }),
    ).toThrow(/未設定/)
    expect(() => readAccessConfig({ CF_ACCESS_AUD: 'aud-tag' })).toThrow(/未設定/)
  })
})
