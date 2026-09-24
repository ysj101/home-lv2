import { relations, sql } from 'drizzle-orm'
import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
} from 'drizzle-orm/sqlite-core'

import type { TaskCategory } from '@/lib/task-category'

/**
 * 主キーの既定は挿入時に採番する UUID v4。
 * ただし seed で投入するマスタデータ（task_templates）だけは、コードと DB の
 * 対応を保つために seed 側が安定したスラッグを明示的に渡す。
 */
const id = () =>
  text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID())

/** 作成・更新時刻。SQLite には日時型がないため epoch ミリ秒で保持する。 */
const timestamps = {
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
}

/**
 * アプリへログイン可能な利用者。
 * 認証自体は Cloudflare Access が行い、`email` で Access 済みの本人と紐付ける。
 */
export const users = sqliteTable('users', {
  id: id(),
  // unique 制約が索引も兼ねるため、email への index は別途張らない。
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  ...timestamps,
})

/** 世帯。MVP では1件のみ存在する。 */
export const households = sqliteTable('households', {
  id: id(),
  name: text('name').notNull(),
  ...timestamps,
})

/** MVP では `member` のみ。将来 `owner` を追加できるよう union 型で表現する。 */
export const HOUSEHOLD_MEMBER_ROLES = ['member'] as const
export type HouseholdMemberRole = (typeof HOUSEHOLD_MEMBER_ROLES)[number]

/** ログインユーザーと Household の関連。 */
export const householdMembers = sqliteTable(
  'household_members',
  {
    householdId: text('household_id')
      .notNull()
      .references(() => households.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: text('role')
      .$type<HouseholdMemberRole>()
      .notNull()
      .default('member'),
    createdAt: timestamps.createdAt,
  },
  (table) => [
    primaryKey({ columns: [table.householdId, table.userId] }),
    index('household_members_user_id_idx').on(table.userId),
  ],
)

/**
 * 引越し（Main Quest）。MVP では Household ごとに1件を想定する。
 *
 * `move_date` は時刻を持たない「日付」なので、epoch ではなく `YYYY-MM-DD` の
 * 文字列で保持する。Task の期限算出（`dueDate = moveDate + offsetDays`）は
 * `@/lib/date` の文字列ベースの関数で行う。
 */
export const moves = sqliteTable(
  'moves',
  {
    id: id(),
    householdId: text('household_id')
      .notNull()
      .references(() => households.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    /** `YYYY-MM-DD` */
    moveDate: text('move_date').notNull(),
    oldAddress: text('old_address'),
    newAddress: text('new_address'),
    ...timestamps,
  },
  (table) => [index('moves_household_id_idx').on(table.householdId)],
)

/**
 * 標準 TODO の雛形。引越し日に `offset_days` を足した日付が Task の期限になる
 * （spec §11 UC-02）。`sort_order` は Task 生成時と一覧表示での並び順。
 */
export const taskTemplates = sqliteTable('task_templates', {
  id: id(),
  title: text('title').notNull(),
  description: text('description'),
  category: text('category').$type<TaskCategory>().notNull(),
  /** 引越し日からの相対日数。引越し前はマイナス、後はプラス。 */
  offsetDays: integer('offset_days').notNull(),
  sortOrder: integer('sort_order').notNull(),
  ...timestamps,
})

/** MVP は todo / completed のみ。将来 in_progress / blocked を追加できる。 */
export const TASK_STATUSES = ['todo', 'completed'] as const
export type TaskStatus = (typeof TASK_STATUSES)[number]

/** テンプレート由来か手動追加か。引越し日変更時の期限再計算の対象を絞るために使う。 */
export const TASK_SOURCES = ['template', 'manual'] as const
export type TaskSource = (typeof TASK_SOURCES)[number]

/**
 * 個々の TODO（Quest）。
 *
 * `due_date` は move_date と同じく `YYYY-MM-DD` の文字列。`completed_at` は
 * 完了した瞬間の時刻なので epoch ミリ秒で保持する。
 */
export const tasks = sqliteTable(
  'tasks',
  {
    id: id(),
    moveId: text('move_id')
      .notNull()
      .references(() => moves.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description'),
    category: text('category').$type<TaskCategory>().notNull(),
    /** `YYYY-MM-DD` */
    dueDate: text('due_date'),
    assigneeId: text('assignee_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    status: text('status').$type<TaskStatus>().notNull().default('todo'),
    source: text('source').$type<TaskSource>().notNull(),
    // テンプレートが消えても生成済みの Task は残す。
    templateId: text('template_id').references(() => taskTemplates.id, {
      onDelete: 'set null',
    }),
    completedAt: integer('completed_at', { mode: 'timestamp_ms' }),
    completedBy: text('completed_by').references(() => users.id, {
      onDelete: 'set null',
    }),
    ...timestamps,
  },
  (table) => [
    index('tasks_move_id_idx').on(table.moveId),
    index('tasks_due_date_idx').on(table.dueDate),
    index('tasks_status_idx').on(table.status),
  ],
)

export const usersRelations = relations(users, ({ many }) => ({
  householdMembers: many(householdMembers),
  assignedTasks: many(tasks, { relationName: 'assignee' }),
  completedTasks: many(tasks, { relationName: 'completedBy' }),
}))

export const householdsRelations = relations(households, ({ many }) => ({
  members: many(householdMembers),
  moves: many(moves),
}))

export const movesRelations = relations(moves, ({ one, many }) => ({
  household: one(households, {
    fields: [moves.householdId],
    references: [households.id],
  }),
  tasks: many(tasks),
}))

export const taskTemplatesRelations = relations(taskTemplates, ({ many }) => ({
  tasks: many(tasks),
}))

export const tasksRelations = relations(tasks, ({ one }) => ({
  move: one(moves, { fields: [tasks.moveId], references: [moves.id] }),
  assignee: one(users, {
    fields: [tasks.assigneeId],
    references: [users.id],
    relationName: 'assignee',
  }),
  completedByUser: one(users, {
    fields: [tasks.completedBy],
    references: [users.id],
    relationName: 'completedBy',
  }),
  template: one(taskTemplates, {
    fields: [tasks.templateId],
    references: [taskTemplates.id],
  }),
}))

export const householdMembersRelations = relations(
  householdMembers,
  ({ one }) => ({
    household: one(households, {
      fields: [householdMembers.householdId],
      references: [households.id],
    }),
    user: one(users, {
      fields: [householdMembers.userId],
      references: [users.id],
    }),
  }),
)

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type Household = typeof households.$inferSelect
export type NewHousehold = typeof households.$inferInsert
export type HouseholdMember = typeof householdMembers.$inferSelect
export type NewHouseholdMember = typeof householdMembers.$inferInsert
export type Move = typeof moves.$inferSelect
export type NewMove = typeof moves.$inferInsert
export type TaskTemplate = typeof taskTemplates.$inferSelect
export type NewTaskTemplate = typeof taskTemplates.$inferInsert
export type Task = typeof tasks.$inferSelect
export type NewTask = typeof tasks.$inferInsert
