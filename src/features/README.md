# features

Route から直接 D1 を触らず、必ずこの層の Use Case を経由する（`docs/spec.md` §14）。

```text
Route
  ↓
Feature / Use Case   ← ここ
  ↓
Repository / Database
```

## Household スコープの原則

Move / Task の Use Case は、引数の先頭で `HouseholdContext`（`auth/household-context.ts`）を受け取り、
**必ず `context.household.id` でスコープした条件を付けて** DB を操作する。

```ts
export async function getMove(context: HouseholdContext) {
  return context.db
    .select()
    .from(moves)
    .where(eq(moves.householdId, context.household.id)) // ← 必須
}
```

理由は `docs/spec.md` §25 Data Integrity の「User が所属する Household 以外のデータへ
アクセスできない」。ID を受け取って更新・削除する Use Case では、更新条件にも
`householdId` を含めるか、対象を読み直して所属を検証してから操作する。

生の `Db` だけを受け取る Use Case は作らないこと。スコープを付け忘れても型で気づけなくなる。

## 認証の入口

Server Function は `auth/context.ts` の `requireContext()` を最初に呼ぶ。

```text
requireContext()
  ├─ verifyAccessJwt()        Cf-Access-Jwt-Assertion を JWKS で検証 → email
  ├─ getCurrentUser()         email → users（未登録なら 403）
  └─ getCurrentHousehold()    user → household（所属なしなら 403）
```

`context.ts` は `cloudflare:workers` の `env` に触るため Node のテストからは読めない。
テスト可能なロジックは `household-context.ts` 以下に置く。
