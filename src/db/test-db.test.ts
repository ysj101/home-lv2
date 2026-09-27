import { afterEach, describe, expect, it } from 'vitest'

import { households, householdMembers, users } from '@/db/schema'
import { createTestDb, sqliteErrorMessage, type TestDb } from '@/db/test-db'

let db: TestDb

afterEach(() => db?.close())

/** 制約違反のメッセージを取り出す。 */
async function messageOf(promise: Promise<unknown>): Promise<string> {
  try {
    await promise
    return ''
  } catch (error) {
    return sqliteErrorMessage(error)
  }
}

describe('createTestDb', () => {
  it('マイグレーション適用済みの DB を返す', async () => {
    db = createTestDb()

    await db.insert(households).values({ id: 'h1', name: 'Our Family' })

    expect(await db.select().from(households)).toEqual([
      expect.objectContaining({ id: 'h1', name: 'Our Family' }),
    ])
  })

  it('created_at / updated_at の DEFAULT が効く', async () => {
    db = createTestDb()

    await db
      .insert(users)
      .values({ id: 'u1', email: 'a@example.com', name: 'A' })
    const [user] = await db.select().from(users)

    expect(user.createdAt).toBeInstanceOf(Date)
    expect(user.createdAt.getTime()).toBeGreaterThan(0)
  })

  it('unique 制約が効く', async () => {
    db = createTestDb()
    await db
      .insert(users)
      .values({ id: 'u1', email: 'a@example.com', name: 'A' })

    expect(
      await messageOf(
        db.insert(users).values({ id: 'u2', email: 'a@example.com', name: 'B' }),
      ),
    ).toMatch(/UNIQUE constraint failed: users\.email/)
  })

  it('外部キー制約が効く', async () => {
    db = createTestDb()

    expect(
      await messageOf(
        db
          .insert(householdMembers)
          .values({ householdId: 'missing', userId: 'missing' }),
      ),
    ).toMatch(/FOREIGN KEY constraint failed/)
  })

  it('テストごとに独立している', async () => {
    db = createTestDb()

    expect(await db.select().from(households)).toEqual([])
  })
})
