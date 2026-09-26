import { badRequest } from '@/features/auth/errors'

/**
 * Task のカテゴリ。docs/spec.md §10 Task Categories の9種。
 * DB には文字列で保存し、TypeScript 側は union 型で制約する。
 * UI 表示用の日本語ラベルは #27 で別途用意する。
 */
export const TASK_CATEGORIES = [
  'administrative',
  'utility',
  'moving-company',
  'packing',
  'home',
  'finance',
  'address-change',
  'child',
  'other',
] as const

export type TaskCategory = (typeof TASK_CATEGORIES)[number]

/** §10 の9種に含まれない値なら 400。 */
export function requireTaskCategory(value: string): TaskCategory {
  if (!TASK_CATEGORIES.includes(value as TaskCategory)) {
    throw badRequest(`不明なカテゴリです: ${value}`)
  }

  return value as TaskCategory
}
