# e2e

ローカル D1 を全テストで共有するため、以下の前提で書く。

- `global-setup.ts` が実行のたびに DB を作り直す（Move 未登録 / テンプレート25件 / 家族2人）
- `playwright.config.ts` で `fullyParallel: false` / `workers: 1`。並列にすると
  複数の spec がそれぞれ引越しを登録してしまう
- **ファイル名の数字で実行順を固定する**。Playwright はファイルパス順に流すので、
  先に動くものほど小さい番号にする

```
01-smoke          レイアウトとナビ（データ不要）
02-move-settings  Move 未登録 → 登録 → 編集
03-task-list      標準 Quest 25件が並ぶ
04-task-filters   25件を前提にした絞り込み
05-create-task    Quest を追加する（件数が増える）
06-task-detail    編集・削除する（件数が減る）
```

件数を足し引きする spec（05 以降）では、絶対値ではなく実行前との差で検証する。
