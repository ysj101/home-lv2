import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { households, householdMembers, users } from '@/db/schema'
import { createTestDb, type TestDb } from '@/db/test-db'
import { getCurrentHousehold } from '@/features/auth/get-current-household'
import { resolveHouseholdContext } from '@/features/auth/household-context'

let db: TestDb

beforeEach(async () => {
  db = createTestDb()
  await db.insert(households).values([
    { id: 'h1', name: 'Our Family' },
    { id: 'h2', name: 'Another Family' },
  ])
  await db.insert(users).values([
    { id: 'u1', email: 'adult-a@example.com', name: 'Adult A' },
    { id: 'u2', email: 'adult-b@example.com', name: 'Adult B' },
    { id: 'u3', email: 'loner@example.com', name: 'Loner' },
  ])
  await db.insert(householdMembers).values([
    { householdId: 'h1', userId: 'u1' },
    { householdId: 'h2', userId: 'u2' },
  ])
})

afterEach(() => db.close())

describe('getCurrentHousehold', () => {
  it('所属 Household を返す', async () => {
    expect(await getCurrentHousehold(db, 'u1')).toMatchObject({
      id: 'h1',
      name: 'Our Family',
    })
  })

  it('User ごとに正しい Household を返す', async () => {
    expect(await getCurrentHousehold(db, 'u2')).toMatchObject({ id: 'h2' })
  })

  it('所属が無い User は 403', async () => {
    await expect(getCurrentHousehold(db, 'u3')).rejects.toMatchObject({
      status: 403,
    })
  })
})

describe('resolveHouseholdContext', () => {
  it('db / user / household をまとめて返す', async () => {
    const context = await resolveHouseholdContext(db, 'adult-a@example.com')

    expect(context.user).toMatchObject({ id: 'u1' })
    expect(context.household).toMatchObject({ id: 'h1' })
    expect(context.db).toBe(db)
  })

  it('未登録メールは 403（User 解決で落ちる）', async () => {
    await expect(
      resolveHouseholdContext(db, 'stranger@example.com'),
    ).rejects.toMatchObject({ status: 403 })
  })

  it('所属が無い User は 403（Household 解決で落ちる）', async () => {
    await expect(
      resolveHouseholdContext(db, 'loner@example.com'),
    ).rejects.toThrow(/どの Household にも所属していません/)
  })
})
