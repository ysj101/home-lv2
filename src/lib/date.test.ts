import { describe, expect, it } from 'vitest'

import { addDays, daysBetween, today } from '@/lib/date'

describe('addDays', () => {
  it('引越し日から offset_days 分ずらした期限を返す', () => {
    expect(addDays('2026-11-15', -7)).toBe('2026-11-08')
  })

  it('月をまたいでも正しく計算する', () => {
    expect(addDays('2026-11-01', -1)).toBe('2026-10-31')
  })

  it('0日ずらすと同じ日付を返す', () => {
    expect(addDays('2026-11-15', 0)).toBe('2026-11-15')
  })
})

describe('daysBetween', () => {
  it('引越しまでの残り日数を返す', () => {
    expect(daysBetween('2026-11-01', '2026-11-15')).toBe(14)
  })

  it('期限を過ぎている場合は負の値を返す', () => {
    expect(daysBetween('2026-11-20', '2026-11-15')).toBe(-5)
  })
})

describe('today', () => {
  it('JST の日付を YYYY-MM-DD で返す', () => {
    // 2026-11-15T15:30Z は JST では翌日 00:30。
    expect(today(new Date('2026-11-15T15:30:00Z'))).toBe('2026-11-16')
  })

  it('UTC で日付が変わる前でも JST では進んでいる', () => {
    expect(today(new Date('2026-11-15T23:59:00Z'))).toBe('2026-11-16')
  })

  it('JST の日中はそのままの日付', () => {
    expect(today(new Date('2026-11-15T03:00:00Z'))).toBe('2026-11-15')
  })
})
