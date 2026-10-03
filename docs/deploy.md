# 本番デプロイ手順

Home Lv.2 を Cloudflare Workers（D1 + Cloudflare Access）へデプロイする手順。GitHub Issue: #42。

```text
1. D1 にマイグレーションを当てる
2. 初期データ（Household / Users / TaskTemplates）を入れる   ← 初回のみ
3. Access の値を wrangler.jsonc に入れる                     ← 初回のみ
4. Worker をデプロイする
5. Access 越しに動作確認する
```

## 前提

- `pnpm exec wrangler whoami` でアカウントにログインしていること（`wrangler login`）
- Cloudflare Access の設定が済んでいること（`docs/cloudflare-access.md` の 1〜4）

## 1. マイグレーション

```bash
pnpm db:migrate:remote
```

本番 D1（`home-lv2-db`）に未適用のマイグレーションを当てる。2 回目以降のデプロイでも、
マイグレーションを足したときは **Worker より先に** 当てる（新しいコードが古いスキーマを読まないように）。

## 2. 初期データ（初回のみ）

```bash
SEED_ADULT_A_EMAIL=<Adult A のメール> SEED_ADULT_A_NAME=<表示名> \
SEED_ADULT_B_EMAIL=<Adult B のメール> SEED_ADULT_B_NAME=<表示名> \
SEED_HOUSEHOLD_NAME=<世帯名> \
pnpm db:seed:remote
```

- `--remote` は `.dev.vars` を読まない。`.dev.vars` の example アドレスが本番に入らないよう、
  値は必ずコマンドの環境変数で渡す（足りなければ未設定のキーを挙げて止まる）
- メールアドレスは Access の Policy に登録したものと完全に一致させる。一致しないと Access は
  通ってもアプリが 403 を返す
- seed は冪等なので、標準 TODO のテンプレートを足したときも同じコマンドで追加できる
  （既存の行には触らない）

## 3. Access の値（初回のみ）

`docs/cloudflare-access.md` の「5. 値をリポジトリに入れる」に従い、`wrangler.jsonc` の
`vars` に Team domain と AUD タグを入れてコミットする。どちらもシークレットではない。

値が空のままデプロイしても、Worker は全リクエストで設定エラーの画面（500）を返し、
データには到達しない（fail closed）。先にデプロイして URL を確かめてから
Access の値を入れる順番でも安全。

## 4. デプロイ

```bash
pnpm run deploy
```

`vite build` のあと `wrangler deploy` する。**`pnpm deploy` ではなく `pnpm run deploy`** を使うこと。
`pnpm deploy` は pnpm 組み込みのコマンド（ワークスペースのパッケージ配布）が優先されて動く。

完了すると `https://home-lv2.<サブドメイン>.workers.dev` が表示される。このホスト名が
Access Application の Application domain と一致していること。

## 5. 動作確認

`docs/cloudflare-access.md` の「6. 動作確認（完了条件）」を行う。

```bash
curl -sI https://home-lv2.<サブドメイン>.workers.dev/ | grep -iE '^(HTTP|location)'
```

- `302` で `<team>.cloudflareaccess.com` に飛ばされる → Access が前段に入っている
- 許可外のメールアドレスではログインできない
- Adult A / B でログインし、引越し登録 → Quest の完了 → Dashboard まで一通り使える

401 が返るときは Team domain / AUD の値を疑う（`pnpm exec wrangler tail` で
`Access JWT の検証に失敗しました` を確認）。403 は `users` にメールアドレスが無いときに出る。

## ロールバック

```bash
pnpm exec wrangler deployments list   # 直前のバージョンを確認
pnpm exec wrangler rollback           # 1 つ前のバージョンに戻す
```

Worker を戻しても D1 のマイグレーションは巻き戻らない。スキーマを戻す必要があるときは、
戻すためのマイグレーションを新しく作って当てる。データごと過去の時点に戻すときは
D1 の Time Travel（`pnpm exec wrangler d1 time-travel restore home-lv2-db --timestamp=<時刻>`）を使う。
