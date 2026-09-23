import { describe, expect, it } from 'vitest'

import { addDays, daysBetween, formatDate, parseDate } from '@/lib/date'

describe('addDays', () => {
  it('引越し日から offset_days 分ずらした期限を返す', () => {
    expect(addDays('2026-11-15', -7)).toBe('2026-11-08')
  })

  it('月をまたいでも正しく計算する', () => {
    expect(addDays('2026-11-01', -1)).toBe('2026-10-31')
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

describe('parseDate / formatDate', () => {
  it('相互に変換できる', () => {
    expect(formatDate(parseDate('2026-11-15'))).toBe('2026-11-15')
  })
})
