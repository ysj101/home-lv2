import { describe, expect, it } from 'vitest'

import { validateTaskSearch } from '@/features/task/task-search'

describe('validateTaskSearch', () => {
  it('妥当な値をそのまま通す', () => {
    expect(
      validateTaskSearch({
        status: 'overdue',
        assignee: 'me',
        category: 'utility',
      }),
    ).toEqual({ status: 'overdue', assignee: 'me', category: 'utility' })
  })

  it('既定値の all は URL に残さない', () => {
    expect(validateTaskSearch({ status: 'all' }).status).toBeUndefined()
  })

  it('不明な値は黙って無視する（手で URL を書き換えられても落ちない）', () => {
    expect(
      validateTaskSearch({
        status: 'bogus',
        assignee: 'someone',
        category: 'travel',
      }),
    ).toEqual({
      status: undefined,
      assignee: undefined,
      category: undefined,
    })
  })

  it('空の search でも成立する', () => {
    expect(validateTaskSearch({})).toEqual({
      status: undefined,
      assignee: undefined,
      category: undefined,
    })
  })
})
