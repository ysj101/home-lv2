import { TASK_CATEGORIES, type TaskCategory } from '@/lib/task-category'
import {
  TASK_ASSIGNEE_FILTERS,
  TASK_STATUS_FILTERS,
  type TaskAssigneeFilter,
  type TaskStatusFilter,
} from '@/features/task/get-tasks'

/**
 * Task List の絞り込み条件。URL の search params に保持する。
 * リロードしても戻っても同じ結果になり、条件付きのリンクも作れる。
 */
export type TaskSearch = {
  status?: TaskStatusFilter
  assignee?: TaskAssigneeFilter
  category?: TaskCategory
}

/** 配列に含まれる値だけを通し、それ以外は undefined にする。 */
function oneOf<T extends string>(
  values: readonly T[],
  raw: unknown,
): T | undefined {
  return values.includes(raw as T) ? (raw as T) : undefined
}

/**
 * URL から受け取った値を検証する。
 * 手で URL を書き換えられても落ちないよう、不明な値は黙って無視する。
 */
export function validateTaskSearch(raw: Record<string, unknown>): TaskSearch {
  const status = oneOf(TASK_STATUS_FILTERS, raw.status)

  return {
    // 既定値の all は URL に残さない。
    status: status === 'all' ? undefined : status,
    assignee: oneOf(TASK_ASSIGNEE_FILTERS, raw.assignee),
    category: oneOf(TASK_CATEGORIES, raw.category),
  }
}
