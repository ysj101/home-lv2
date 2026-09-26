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

Move / Task の Use Case は、引数の先頭で `HouseholdContext`（`auth/household-context.ts`）を受け取る。
生の `Db` だけを受け取る Use Case は作らないこと。

スコープの強制は**規約ではなく Repository 層の型**で行う。`db/repositories/*.ts` の
読み書き関数はすべて `householdId` を必須引数に取り、SQL の条件に必ず含める。

```ts
// repositories: householdId が無いと呼べない
updateTaskInHousehold(db, householdId, taskId, values): Promise<Task | null>

// use case: null を 404 に変換するだけ
const task = await updateTaskInHousehold(
  context.db,
  context.household.id,
  taskId,
  values,
)
if (!task) throw notFound('タスクが見つかりません。')
```

理由は `docs/spec.md` §25 Data Integrity の「User が所属する Household 以外のデータへ
アクセスできない」。「呼ぶ前に所属を確認する」という約束だと、確認を1行忘れても
コンパイルが通ってしまう。

対象が見つからないときは **403 ではなく 404** を返す。403 と区別すると、その ID の
データが存在するかどうかが漏れる。

Move を丸ごと1件引きたい場合は `move/require-move.ts` の `requireMove()` を使う。

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
