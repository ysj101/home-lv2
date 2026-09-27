import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { createTestDb, type TestDb } from '@/db/test-db'
import type { HouseholdContext } from '@/features/auth/household-context'
import { createTestContext } from '@/features/auth/test-context'
import { createMove } from '@/features/move/create-move'
import { getMove } from '@/features/move/get-move'
import { updateMove } from '@/features/move/update-move'

let db: TestDb
let context: HouseholdContext
let otherContext: HouseholdContext

const input = {
  name: 'Home Lv.2',
  moveDate: '2026-11-15',
  oldAddress: '東京都〇〇区',
  newAddress: '神奈川県△△市',
}

beforeEach(async () => {
  db = createTestDb()
  context = await createTestContext(db)
  otherContext = await createTestContext(db, {
    householdId: 'h2',
    householdName: 'Another Family',
    userId: 'u2',
    email: 'other@example.com',
    userName: 'Other',
  })
})

afterEach(() => db.close())

describe('createMove', () => {
  it('現在 Household の Move を作成する', async () => {
    const move = await createMove(context, input)

    expect(move).toMatchObject({
      householdId: 'h1',
      name: 'Home Lv.2',
      moveDate: '2026-11-15',
      oldAddress: '東京都〇〇区',
      newAddress: '神奈川県△△市',
    })
    expect(move.id).toMatch(/^[0-9a-f-]{36}$/)
  })

  it('引越し名の前後の空白を落とす', async () => {
    const move = await createMove(context, { ...input, name: '  Home Lv.2  ' })

    expect(move.name).toBe('Home Lv.2')
  })

  it('引越し名が空なら 400', async () => {
    await expect(
      createMove(context, { ...input, name: '   ' }),
    ).rejects.toMatchObject({ status: 400 })
  })

  it('日付形式が不正なら 400', async () => {
    await expect(
      createMove(context, { ...input, moveDate: '2026/11/15' }),
    ).rejects.toMatchObject({ status: 400 })
  })

  it('存在しない日付なら 400', async () => {
    await expect(
      createMove(context, { ...input, moveDate: '2026-02-30' }),
    ).rejects.toMatchObject({ status: 400 })
  })

  it('住所は任意（空なら null）', async () => {
    const move = await createMove(context, {
      name: 'Home Lv.2',
      moveDate: '2026-11-15',
    })

    expect(move.oldAddress).toBeNull()
    expect(move.newAddress).toBeNull()
  })
})

describe('getMove', () => {
  it('未登録なら null', async () => {
    expect(await getMove(context)).toBeNull()
  })

  it('現在 Household の Move を返す', async () => {
    await createMove(context, input)

    expect(await getMove(context)).toMatchObject({ name: 'Home Lv.2' })
  })

  it('他 Household の Move は返らない', async () => {
    await createMove(otherContext, { ...input, name: 'Their Move' })

    expect(await getMove(context)).toBeNull()
  })
})

describe('updateMove', () => {
  it('渡した項目だけを更新する', async () => {
    const move = await createMove(context, input)

    const updated = await updateMove(context, move.id, { name: 'Home Lv.3' })

    expect(updated).toMatchObject({
      name: 'Home Lv.3',
      moveDate: '2026-11-15',
      oldAddress: '東京都〇〇区',
    })
  })

  it('引越し日を更新できる', async () => {
    const move = await createMove(context, input)

    expect(
      await updateMove(context, move.id, { moveDate: '2026-12-01' }),
    ).toMatchObject({ moveDate: '2026-12-01' })
  })

  it('住所を空にすると null になる', async () => {
    const move = await createMove(context, input)

    expect(
      await updateMove(context, move.id, { oldAddress: '' }),
    ).toMatchObject({ oldAddress: null })
  })

  it('updated_at が進む', async () => {
    const move = await createMove(context, input)

    const updated = await updateMove(context, move.id, { name: 'Home Lv.3' })

    expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(
      move.updatedAt.getTime(),
    )
  })

  it('不正な値は 400', async () => {
    const move = await createMove(context, input)

    await expect(
      updateMove(context, move.id, { name: '' }),
    ).rejects.toMatchObject({ status: 400 })
    await expect(
      updateMove(context, move.id, { moveDate: 'bad' }),
    ).rejects.toMatchObject({ status: 400 })
  })

  it('他 Household の Move は更新できない（404）', async () => {
    const theirMove = await createMove(otherContext, input)

    await expect(
      updateMove(context, theirMove.id, { name: 'Hijacked' }),
    ).rejects.toMatchObject({ status: 404 })

    expect(await getMove(otherContext)).toMatchObject({ name: 'Home Lv.2' })
  })

  it('存在しない Move は 404', async () => {
    await expect(
      updateMove(context, 'missing', { name: 'x' }),
    ).rejects.toMatchObject({ status: 404 })
  })
})
