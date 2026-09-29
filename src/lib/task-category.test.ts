import { describe, expect, it } from 'vitest'

import {
  TASK_CATEGORIES,
  TASK_CATEGORY_OPTIONS,
  categoryLabel,
  requireTaskCategory,
} from '@/lib/task-category'

describe('categoryLabel', () => {
  it('spec §10 の日本語ラベルを返す', () => {
    expect(categoryLabel('administrative')).toBe('行政手続き')
    expect(categoryLabel('utility')).toBe('電気・ガス・水道')
    expect(categoryLabel('moving-company')).toBe('引越し業者')
    expect(categoryLabel('packing')).toBe('荷造り')
    expect(categoryLabel('child')).toBe('子ども関連')
  })

  it('9種すべてにラベルがあり、空文字が無い', () => {
    for (const category of TASK_CATEGORIES) {
      expect(categoryLabel(category)).toBeTruthy()
    }
  })

  it('ラベルが重複していない', () => {
    const labels = TASK_CATEGORIES.map(categoryLabel)

    expect(new Set(labels).size).toBe(labels.length)
  })
})

describe('TASK_CATEGORY_OPTIONS', () => {
  it('全カテゴリを定義順で value / label の組にする', () => {
    expect(TASK_CATEGORY_OPTIONS).toHaveLength(TASK_CATEGORIES.length)
    expect(TASK_CATEGORY_OPTIONS[0]).toEqual({
      value: 'administrative',
      label: '行政手続き',
    })
  })
})

describe('requireTaskCategory', () => {
  it('定義済みの値はそのまま返す', () => {
    expect(requireTaskCategory('utility')).toBe('utility')
  })

  it('未定義の値は 400', () => {
    expect(() => requireTaskCategory('travel')).toThrow(/不明なカテゴリ/)
  })
})
