# Alchemy によるインフラ管理

Home Lv.2 のインフラ（Worker / D1 / Cloudflare Access）は [Alchemy v2](https://alchemy.run/) で
`alchemy.run.ts` に定義する。移行の全体像と進捗は Tracking Issue #99。

```text
alchemy.run.ts ──(alchemy deploy)──▶ Cloudflare
  ├─ Cloudflare.D1.Database        D1（マイグレーションは #94 で設定）
  ├─ Cloudflare.Access.Application Access Application + Policy
  └─ Cloudflare.Website.Vite       Worker（vite build の結果をそのまま配置）
```

> 移行が終わるまで（#97）、本番は `wrangler.jsonc` と `docs/deploy.md` の手順のまま。
> `alchemy deploy --stage prod` はまだ実行しないこと。

## 初回セットアップ（開発者ごと）

### 1. Cloudflare の認証

```bash
pnpm exec alchemy profile edit --add Cloudflare
```

- 認証方式は **OAuth**（ブラウザでデバイスログイン）
- スコープは **All Scopes** を選ぶ。**Basic Scopes では Access Application を作れない**
  （`auth.forbidden (1010)` になる）。カスタムで選ぶなら「Cloudflare One / Zero Trust」を含める
- 認証情報は `~/.alchemy/` に保存される。`wrangler login` とは別物で、両方入れて共存できる

### 2. state store

state（どのリソースを作ったかの記録）は Cloudflare 上の state store に置く。
アカウントに 1 つだけ作れば、すべての stack / stage で共有される。

```bash
pnpm alchemy:bootstrap
```

作られるもの（Worker `alchemy-state-store` と、その認証トークン・暗号化鍵を入れる Secrets Store）。
2 回目以降は既存の store を使うので、何度実行しても増えない。

`.alchemy/` には `alchemy dev` のローカル D1 やログが入る。gitignore 済みで、消しても困らない。

### 3. 動作確認

```bash
pnpm alchemy:plan
```

`Plan: N to create` のように出れば認証と state store は通っている。
自分の stage（`live_<user>`）にまだ何も無ければすべて `create` になる。

## stage

| stage | 用途 | コマンド |
| --- | --- | --- |
| `dev_<user>` | ローカル開発（Worker と D1 は手元で動く） | `pnpm alchemy:dev` |
| `live_<user>` | 開発者ごとの検証環境（Cloudflare 上） | `pnpm alchemy:deploy` |
| `prod` | 本番（#97 で切り替えるまで使わない） | `pnpm alchemy:deploy --stage prod` |

物理名には stage が入る（例: `homelv2-website-live-ysj-<hash>`）ので、stage が違えば本番とは衝突しない。
検証が終わったら `pnpm alchemy:destroy`（既定で `live_<user>`）で消す。

## 分かっている制約

- `alchemy@2.0.0-beta.84` は effect 4.1 系と噛み合わない（存在しない `effect/Crypto` を import する）。
  effect 4.0.7 に固定し、`@effect/platform-node-shared` を `pnpm.overrides` で合わせている。
  beta.85 以降に上げるときに外す（#91 のコメント参照）
- `@cloudflare/vite-plugin` は Alchemy の Vite プラグインと非互換なので `vite.config.ts` から外した。
  そのため `pnpm dev`（`vite dev`）単体では Workers のバインディングが使えない。#96 で `alchemy dev` に乗せ換える
- `alchemy dev` では共有 Access Application を作れない（ローカル Worker には domain が無い）。
  `ALCHEMY_DEV` で分岐して dev では Access を宣言せず、`DEV_USER_EMAIL` バイパスを使う
