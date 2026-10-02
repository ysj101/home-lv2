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

```
07-complete-toggle  完了 / 再オープン
08-assignee         担当者の設定
09-dashboard        Main Quest / 進捗
10-dashboard-lists  Dashboard の4セクション
11-recalculation    引越し日変更時の期限再計算
12-responsive       モバイル幅のレイアウト
```

件数を足し引きする spec（05 以降）では、絶対値ではなく実行前との差で検証する。

## プロジェクトの役割

DB は global-setup で1回だけ作り直すので、全 spec を複数プロジェクトで回すと
2周目はデータが残った状態で走ってしまう。そのため役割を分けている。

| project | 幅 | 対象 |
|---|---|---|
| `desktop-chromium` | - | 全 spec（機能の検証） |
| `mobile-safari` | 390px | `12-responsive` のみ |
| `mobile-small` | 375px | `12-responsive` のみ |
