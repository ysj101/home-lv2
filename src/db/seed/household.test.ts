import { describe, expect, it } from 'vitest'

import { buildHouseholdSeedStatements } from '@/db/seed/household'

const config = {
  householdName: 'Our Family',
  adults: [
    { email: 'a@example.com', name: 'Adult A' },
    { email: "o'brien@example.com", name: "O'Brien" },
  ],
}

describe('buildHouseholdSeedStatements', () => {
  it('households 1件と Adult ごとの users / household_members を組み立てる', () => {
    const statements = buildHouseholdSeedStatements(config)

    expect(statements).toHaveLength(5)
    expect(statements[0]).toContain('INSERT INTO households')
    expect(
      statements.filter((s) => s.startsWith('INSERT INTO users')),
    ).toHaveLength(2)
    expect(
      statements.filter((s) => s.startsWith('INSERT INTO household_members')),
    ).toHaveLength(2)
  })

  it('家族の情報は既存行に触らない（ON CONFLICT DO NOTHING）', () => {
    for (const statement of buildHouseholdSeedStatements(config)) {
      expect(statement).toContain('ON CONFLICT')
      expect(statement).toContain('DO NOTHING')
    }
  })

  it('シングルクォートを含む値をエスケープする', () => {
    const sql = buildHouseholdSeedStatements(config).join('\n')

    expect(sql).toContain("'o''brien@example.com'")
    expect(sql).not.toContain("'o'brien@example.com'")
  })

  it('household_members は email から既存 user_id を引き直す', () => {
    const memberStatement = buildHouseholdSeedStatements(config).find((s) =>
      s.startsWith('INSERT INTO household_members'),
    )

    expect(memberStatement).toContain('(SELECT id FROM users WHERE email =')
    expect(memberStatement).toContain('ON CONFLICT(household_id, user_id)')
  })
})
