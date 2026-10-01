import { describe, expect, it } from 'vitest'

import {
  buildDashboardSections,
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

describe('buildDashboardSections', () => {
  const at = (date: string) => new Date(`${date}T00:00:00Z`)
  const tasks = [
    { id: 'overdue', ...task('2026-10-30'), completedAt: null },
    { id: 'today', ...task(TODAY), completedAt: null },
    { id: 'week', ...task('2026-11-05'), completedAt: null },
    { id: 'far', ...task('2026-11-30'), completedAt: null },
    { id: 'none', ...task(null), completedAt: null },
    {
      id: 'old-clear',
      ...task('2026-10-20', 'completed'),
      completedAt: at('2026-10-21'),
    },
    {
      id: 'new-clear',
      ...task('2026-10-25', 'completed'),
      completedAt: at('2026-10-28'),
    },
  ]

  const ids = (list: { id: string }[]) => list.map((item) => item.id)

  it('期限超過を集める', () => {
    expect(ids(buildDashboardSections(tasks, TODAY).overdue)).toEqual([
      'overdue',
    ])
  })

  it('今日が期限のものを集める', () => {
    expect(ids(buildDashboardSections(tasks, TODAY).dueToday)).toEqual(['today'])
  })

  it('今週からは今日ぶんを除く', () => {
    const { thisWeek } = buildDashboardSections(tasks, TODAY)

    expect(ids(thisWeek)).toEqual(['week'])
    expect(ids(thisWeek)).not.toContain('today')
  })

  it('最近完了は完了日の降順', () => {
    expect(ids(buildDashboardSections(tasks, TODAY).recentlyCleared)).toEqual([
      'new-clear',
      'old-clear',
    ])
  })

  it('完了済みは期限のセクションに出さない', () => {
    const { overdue, dueToday, thisWeek } = buildDashboardSections(tasks, TODAY)

    for (const section of [overdue, dueToday, thisWeek]) {
      expect(ids(section)).not.toContain('old-clear')
    }
  })
})
