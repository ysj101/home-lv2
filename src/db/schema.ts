import { relations, sql } from 'drizzle-orm'
import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
} from 'drizzle-orm/sqlite-core'

/** 主キーは D1 上で衝突しない UUID v4 を採用する。 */
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

export const usersRelations = relations(users, ({ many }) => ({
  householdMembers: many(householdMembers),
}))

export const householdsRelations = relations(households, ({ many }) => ({
  members: many(householdMembers),
  moves: many(moves),
}))

export const movesRelations = relations(moves, ({ one }) => ({
  household: one(households, {
    fields: [moves.householdId],
    references: [households.id],
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
