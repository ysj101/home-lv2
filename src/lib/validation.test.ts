import { describe, expect, it } from 'vitest'

import {
  isValidDate,
  optionalText,
  requireDate,
  requireText,
} from '@/lib/validation'

describe('isValidDate', () => {
  it('YYYY-MM-DD を受け付ける', () => {
    expect(isValidDate('2026-11-15')).toBe(true)
  })

  it('形式が違えば false', () => {
    expect(isValidDate('2026/11/15')).toBe(false)
    expect(isValidDate('2026-11-5')).toBe(false)
    expect(isValidDate('')).toBe(false)
  })

  it('存在しない日付は false', () => {
    expect(isValidDate('2026-02-30')).toBe(false)
    expect(isValidDate('2026-13-01')).toBe(false)
  })

  it('うるう年を正しく扱う', () => {
    expect(isValidDate('2028-02-29')).toBe(true)
    expect(isValidDate('2026-02-29')).toBe(false)
  })
})

describe('requireText', () => {
  it('前後の空白を落とす', () => {
    expect(requireText('  引越し  ', '引越し名')).toBe('引越し')
  })

  it('空なら 400', () => {
    expect(() => requireText('   ', '引越し名')).toThrow(/引越し名を入力/)
    try {
      requireText('', '引越し名')
    } catch (error) {
      expect(error).toMatchObject({ status: 400 })
    }
  })
})

describe('requireDate', () => {
  it('妥当な日付をそのまま返す', () => {
    expect(requireDate('2026-11-15', '引越し日')).toBe('2026-11-15')
  })

  it('不正なら 400', () => {
    expect(() => requireDate('2026-02-30', '引越し日')).toThrow(
      /YYYY-MM-DD 形式/,
    )
  })
})

describe('optionalText', () => {
  it('空文字・空白・undefined は null に寄せる', () => {
    expect(optionalText('')).toBeNull()
    expect(optionalText('   ')).toBeNull()
    expect(optionalText(undefined)).toBeNull()
    expect(optionalText(null)).toBeNull()
  })

  it('値があれば trim して返す', () => {
    expect(optionalText('  東京都  ')).toBe('東京都')
  })
})
