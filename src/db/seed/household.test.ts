import { describe, expect, it } from 'vitest'

import {
  MVP_HOUSEHOLD_ID,
  buildHouseholdSeedStatements,
} from '@/db/seed/household'

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
    expect(statements[0]).toContain(MVP_HOUSEHOLD_ID)
    expect(
      statements.filter((s) => s.startsWith('INSERT INTO users')),
    ).toHaveLength(2)
    expect(
      statements.filter((s) => s.startsWith('INSERT INTO household_members')),
    ).toHaveLength(2)
  })

  it('すべての INSERT が ON CONFLICT DO NOTHING で冪等になっている', () => {
    for (const statement of buildHouseholdSeedStatements(config)) {
      expect(statement).toContain('ON CONFLICT')
      expect(statement).toContain('DO NOTHING')
    }
  })

  it('シングルクォートを含む値をエスケープする', () => {
    const statements = buildHouseholdSeedStatements(config)

    expect(statements.join('\n')).toContain("'o''brien@example.com'")
    expect(statements.join('\n')).not.toContain("'o'brien@example.com'")
  })

  it('household_members は email から既存 user_id を引き直す', () => {
    const memberStatement = buildHouseholdSeedStatements(config).find((s) =>
      s.startsWith('INSERT INTO household_members'),
    )

    expect(memberStatement).toContain('SELECT')
    expect(memberStatement).toContain('FROM users WHERE email =')
  })
})
