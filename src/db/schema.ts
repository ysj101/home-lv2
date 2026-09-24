import { relations, sql } from 'drizzle-orm'
import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
} from 'drizzle-orm/sqlite-core'

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

export const usersRelations = relations(users, ({ many }) => ({
  householdMembers: many(householdMembers),
}))

export const householdsRelations = relations(households, ({ many }) => ({
  members: many(householdMembers),
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
