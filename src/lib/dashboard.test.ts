import { describe, expect, it } from 'vitest'

import {
  type DashboardTask,
  daysUntil,
  isDueToday,
  isOverdue,
  isUpcoming,
  progress,
  progressPercent,
  summarize,
} from '@/lib/dashboard'

const TODAY = '2026-11-01'

function task(
  dueDate: string | null,
  status: DashboardTask['status'] = 'todo',
): DashboardTask {
  return { dueDate, status }
}

describe('daysUntil', () => {
  it('引越しまでの残り日数を返す', () => {
    expect(daysUntil('2026-11-15', TODAY)).toBe(14)
  })

  it('当日は 0', () => {
    expect(daysUntil(TODAY, TODAY)).toBe(0)
  })

  it('過ぎていれば負の値', () => {
    expect(daysUntil('2026-10-30', TODAY)).toBe(-2)
  })
})

describe('progress', () => {
  it('完了率を返す', () => {
    expect(progress([task(null, 'completed'), task(null)])).toBe(0.5)
  })

  it('0件でも NaN にならない', () => {
    expect(progress([])).toBe(0)
    expect(progressPercent([])).toBe(0)
  })

  it('全件完了なら 100%', () => {
    expect(progressPercent([task(null, 'completed')])).toBe(100)
  })

  it('百分率は整数に丸める', () => {
    expect(progressPercent([task(null, 'completed'), task(null), task(null)])).toBe(33)
  })
})

describe('isOverdue', () => {
  it('期限が今日より前なら true', () => {
    expect(isOverdue(task('2026-10-31'), TODAY)).toBe(true)
  })

  it('当日は false（まだ超過していない）', () => {
    expect(isOverdue(task(TODAY), TODAY)).toBe(false)
  })

  it('完了済みは false', () => {
    expect(isOverdue(task('2026-10-31', 'completed'), TODAY)).toBe(false)
  })

  it('期限なしは false', () => {
    expect(isOverdue(task(null), TODAY)).toBe(false)
  })
})

describe('isDueToday', () => {
  it('期限が今日なら true', () => {
    expect(isDueToday(task(TODAY), TODAY)).toBe(true)
  })

  it('前日・翌日は false', () => {
    expect(isDueToday(task('2026-10-31'), TODAY)).toBe(false)
    expect(isDueToday(task('2026-11-02'), TODAY)).toBe(false)
  })

  it('完了済みと期限なしは false', () => {
    expect(isDueToday(task(TODAY, 'completed'), TODAY)).toBe(false)
    expect(isDueToday(task(null), TODAY)).toBe(false)
  })
})

describe('isUpcoming', () => {
  it('当日を含む', () => {
    expect(isUpcoming(task(TODAY), TODAY)).toBe(true)
  })

  it('7日後を含む', () => {
    expect(isUpcoming(task('2026-11-08'), TODAY)).toBe(true)
  })

  it('8日後は含まない', () => {
    expect(isUpcoming(task('2026-11-09'), TODAY)).toBe(false)
  })

  it('期限超過は含まない', () => {
    expect(isUpcoming(task('2026-10-31'), TODAY)).toBe(false)
  })

  it('完了済みと期限なしは false', () => {
    expect(isUpcoming(task('2026-11-03', 'completed'), TODAY)).toBe(false)
    expect(isUpcoming(task(null), TODAY)).toBe(false)
  })
})

describe('summarize', () => {
  it('件数と進捗をまとめて返す', () => {
    const tasks = [
      task('2026-10-25', 'completed'),
      task('2026-10-30'),
      task('2026-11-05'),
      task(null),
    ]

    expect(summarize(tasks, TODAY)).toEqual({
      total: 4,
      completed: 1,
      remaining: 3,
      overdue: 1,
      progressPercent: 25,
    })
  })

  it('0件でも成立する', () => {
    expect(summarize([], TODAY)).toEqual({
      total: 0,
      completed: 0,
      remaining: 0,
      overdue: 0,
      progressPercent: 0,
    })
  })
})
