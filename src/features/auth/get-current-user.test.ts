import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { users } from '@/db/schema'
import { createTestDb, type TestDb } from '@/db/test-db'
import { getCurrentUser } from '@/features/auth/get-current-user'

let db: TestDb

beforeEach(async () => {
  db = createTestDb()
  await db
    .insert(users)
    .values({ id: 'u1', email: 'adult-a@example.com', name: 'Adult A' })
})

afterEach(() => db.close())

describe('getCurrentUser', () => {
  it('登録済みメールから User を返す', async () => {
    const user = await getCurrentUser(db, 'adult-a@example.com')

    expect(user).toMatchObject({ id: 'u1', name: 'Adult A' })
  })

  it('未登録メールは 403', async () => {
    await expect(
      getCurrentUser(db, 'stranger@example.com'),
    ).rejects.toMatchObject({ status: 403 })
  })

  it('403 のメッセージに対象のメールアドレスを含める', async () => {
    await expect(getCurrentUser(db, 'stranger@example.com')).rejects.toThrow(
      /stranger@example\.com/,
    )
  })
})
