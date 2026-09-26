import {
  aliasedTable,
  and,
  asc,
  eq,
  isNotNull,
  isNull,
  lt,
  ne,
  sql,
} from 'drizzle-orm'
import type { SQL } from 'drizzle-orm'

import { moves, tasks, users, type Task } from '@/db/schema'
import { badRequest } from '@/features/auth/errors'
import type { HouseholdContext } from '@/features/auth/household-context'
import { TASK_CATEGORIES, type TaskCategory } from '@/lib/task-category'

/**
 * Task 一覧を取得する（spec §12.2）。
 * フィルターはすべてサーバー側（SQL）で適用する。
 */

export const TASK_STATUS_FILTERS = [
  'all',
  'todo',
  'completed',
  'overdue',
] as const
export type TaskStatusFilter = (typeof TASK_STATUS_FILTERS)[number]

export const TASK_ASSIGNEE_FILTERS = ['me', 'partner', 'unassigned'] as const
export type TaskAssigneeFilter = (typeof TASK_ASSIGNEE_FILTERS)[number]

export type GetTasksFilter = {
  status?: TaskStatusFilter
  assignee?: TaskAssigneeFilter
  category?: TaskCategory
  /** 期限超過の判定に使う「今日」。`YYYY-MM-DD`。 */
  today: string
}

/** 一覧表示に必要な担当者名などを含めた行。 */
export type TaskListItem = Task & {
  assigneeName: string | null
  completedByName: string | null
}

const assignee = aliasedTable(users, 'assignee')
const completer = aliasedTable(users, 'completer')

function statusCondition(
  filter: TaskStatusFilter | undefined,
  today: string,
): SQL | undefined {
  switch (filter) {
    case 'todo':
      return eq(tasks.status, 'todo')
    case 'completed':
      return eq(tasks.status, 'completed')
    case 'overdue':
      return and(ne(tasks.status, 'completed'), lt(tasks.dueDate, today))
    default:
      return undefined
  }
}

function assigneeCondition(
  filter: TaskAssigneeFilter | undefined,
  currentUserId: string,
): SQL | undefined {
  switch (filter) {
    case 'me':
      return eq(tasks.assigneeId, currentUserId)
    case 'partner':
      // 自分以外の誰かが担当しているもの。未割当は含めない。
      return and(ne(tasks.assigneeId, currentUserId), isNotNull(tasks.assigneeId))
    case 'unassigned':
      return isNull(tasks.assigneeId)
    default:
      return undefined
  }
}

export async function getTasks(
  context: HouseholdContext,
  filter: GetTasksFilter,
): Promise<TaskListItem[]> {
  if (filter.category && !TASK_CATEGORIES.includes(filter.category)) {
    throw badRequest(`不明なカテゴリです: ${filter.category}`)
  }

  const rows = await context.db
    .select({
      task: tasks,
      assigneeName: assignee.name,
      completedByName: completer.name,
    })
    .from(tasks)
    .innerJoin(moves, eq(moves.id, tasks.moveId))
    .leftJoin(assignee, eq(assignee.id, tasks.assigneeId))
    .leftJoin(completer, eq(completer.id, tasks.completedBy))
    .where(
      and(
        eq(moves.householdId, context.household.id),
        statusCondition(filter.status, filter.today),
        assigneeCondition(filter.assignee, context.user.id),
        filter.category ? eq(tasks.category, filter.category) : undefined,
      ),
    )
    // 期限なしは末尾。SQLite では NULL が最小なので明示的に後ろへ送る。
    .orderBy(
      asc(sql`case when ${tasks.dueDate} is null then 1 else 0 end`),
      asc(tasks.dueDate),
      asc(tasks.createdAt),
    )

  return rows.map((row) => ({
    ...row.task,
    assigneeName: row.assigneeName,
    completedByName: row.completedByName,
  }))
}
