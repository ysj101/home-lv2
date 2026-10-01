import { badRequest } from '@/features/auth/errors'

/**
 * Task のカテゴリ。docs/spec.md §10 Task Categories の9種。
 * DB には文字列で保存し、TypeScript 側は union 型で制約する。
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

/**
 * UI に出す日本語ラベル（spec §10「UIでは日本語表示する」）。
 *
 * `Record<TaskCategory, string>` にしてあるので、カテゴリを増やしたときに
 * ラベルを足し忘れると型エラーになる。
 */
const CATEGORY_LABELS: Record<TaskCategory, string> = {
  administrative: '行政手続き',
  utility: '電気・ガス・水道',
  'moving-company': '引越し業者',
  packing: '荷造り',
  home: '住まい',
  finance: 'お金',
  'address-change': '住所変更',
  child: '子ども関連',
  other: 'その他',
}

/** カテゴリの日本語ラベルを返す。 */
export function categoryLabel(category: TaskCategory): string {
  return CATEGORY_LABELS[category]
}

/** Select の選択肢など、全カテゴリを表示順で並べたもの。 */
export const TASK_CATEGORY_OPTIONS = TASK_CATEGORIES.map((category) => ({
  value: category,
  label: CATEGORY_LABELS[category],
}))

/** §10 の9種に含まれない値なら 400。 */
export function requireTaskCategory(value: string): TaskCategory {
  if (!TASK_CATEGORIES.includes(value as TaskCategory)) {
    throw badRequest(`不明なカテゴリです: ${value}`)
  }

  return value as TaskCategory
}
