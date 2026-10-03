# e2e

ローカル D1 を全テストで共有するため、以下の前提で書く。

- `global-setup.ts` が実行のたびに DB を初期状態に戻す（Move 未登録 / テンプレート25件 / 家族2人）
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
13-mvp-scenario     MVP の通しシナリオ（Adult A / B の2人で操作する）
```

件数を足し引きする spec（05 以降）では、絶対値ではなく実行前との差で検証する。

## DB のリセット

`database.ts` の `resetDatabase()` が、マイグレーションを当ててから全テーブルの行を消し、
seed を入れ直す。Playwright は webServer を起動してから globalSetup を呼ぶので、
dev サーバーが DB を開いたあとでもリセットが効くよう、`.wrangler` は消さずに中身だけ入れ替える
（ファイルごと消すと、サーバーは開いたままの古いファイルを使い続ける）。

`13-mvp-scenario` は Move 未登録から始めるため、テストの前に自分で `resetDatabase()` を呼ぶ。
テーブルを足したら `database.ts` の `TABLES` にも足すこと。

起動直後の dev サーバーは最初のリクエストで 500 を返すことがあるので、globalSetup は
リセットのあと主要な画面が 200 を返すまで叩いてから終わる。webServer の起動確認は
DB に触らないよう URL ではなくポートで行う（初回は DB が無く、URL だと 500 のまま待ち続ける）。

## Adult A / B の切り替え

dev サーバーは `.dev.vars` の `DEV_USER_EMAIL` で認証をバイパスしている。バイパス中は
`X-Dev-User-Email` ヘッダでリクエストごとにユーザーを差し替えられるので、E2E はこれを使う。

- 既定は Adult A（`playwright.config.ts` の `extraHTTPHeaders`）
- Adult B は `browser.newContext({ extraHTTPHeaders: asUser(ADULT_B) })` で別コンテキストを作る

メールアドレスと名前は seed と同じく環境変数 → `.dev.vars` の順に読む（`users.ts`）。

## 画面遷移

同じページで何度も画面を移るときは `page.goto` ではなく `helpers.ts` の `visit()` を使う。
読み込み途中で次の画面へ移ると、WebKit が中断した import を TanStack Router が
「チャンクが無い」と見なしてページを再読み込みし、次の遷移が打ち消される。

## プロジェクトの役割

DB は global-setup で1回だけ初期化するので、全 spec を複数プロジェクトで回すと
2周目はデータが残った状態で走ってしまう。そのため役割を分けている。

| project | 幅 | 対象 |
|---|---|---|
| `desktop-chromium` | - | 全 spec（機能の検証） |
| `mobile-safari` | 390px | `12-responsive` / `13-mvp-scenario` |
| `mobile-small` | 375px | `12-responsive` / `13-mvp-scenario` |

`13-mvp-scenario` は DB を自前で初期化するので、モバイル幅でも同じシナリオを流せる。

## CI

`.github/workflows/e2e.yml` が PR と `main` への push で `pnpm test:e2e` を流す。
`.dev.vars` は `.dev.vars.example` をコピーして使う（触るのはランナー上のローカル D1 だけ）。
失敗したときは HTML レポートと trace（再試行時に取得）を artifact `playwright-report` に残す。
