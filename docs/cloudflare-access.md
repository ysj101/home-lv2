# Cloudflare Access の設定手順

Home Lv.2 はアプリ内で認証を実装せず、Cloudflare Access で保護する（`docs/spec.md` §5, §25）。
許可するのは Adult A / Adult B の 2 つのメールアドレスだけで、それ以外はすべて拒否する。

```text
Internet
   │
   ▼
Cloudflare Access ── Adult A / B 以外 → ログイン画面で拒否
   │  Cf-Access-Jwt-Assertion を付与
   ▼
Worker (home-lv2)
   │  verifyAccessJwt() で JWT を検証（issuer = Team domain, audience = AUD）
   ▼
Server Functions
```

この手順は Cloudflare ダッシュボード（Zero Trust）での作業が中心で、リポジトリに入るのは
`wrangler.jsonc` の 2 つの値だけ。GitHub Issue: #11。

## 前提

- Cloudflare アカウントで Zero Trust が有効になっていること（Free プランで可。初回は
  Zero Trust > Overview からチーム名を決めてオンボーディングする）。
- Worker のホスト名が決まっていること。`wrangler deploy` すると
  `home-lv2.<アカウントのサブドメイン>.workers.dev` になる。サブドメインは
  Workers & Pages > Overview の右側「Your subdomain」で確認できる。
  Access Application はホスト名単位なので、本番デプロイ（#42）と同じホスト名を使う。

## 1. Identity Provider（One-time PIN）

Zero Trust > Settings > Authentication > Login methods > **Add new** > **One-time PIN**。

One-time PIN はメールで届く 6 桁コードでログインする方式で、外部 IdP の登録が要らない。
2 人しか使わないので MVP はこれで十分。Google ログインにしたくなったら同じ画面から追加できる。

## 2. Access Application

Zero Trust > Access > Applications > **Add an application** > **Self-hosted**。

| 項目 | 値 |
| --- | --- |
| Application name | `Home Lv.2` |
| Session Duration | `24 hours`（引越し準備中は毎日使うので短すぎない値） |
| Application domain | Worker のホスト名（例 `home-lv2.<subdomain>.workers.dev`、path は空） |
| Identity providers | One-time PIN |

Application domain の入力欄では、ドロップダウンから `workers.dev` のサブドメインを選び、
先頭に Worker 名を入れる。カスタムドメインを使う場合はそのゾーンを選ぶ。

## 3. Policy（Adult A / B のみ許可）

同じ画面の Policies で以下を 1 つ作る。

| 項目 | 値 |
| --- | --- |
| Policy name | `Adults only` |
| Action | **Allow** |
| Include | Selector: **Emails**、Value: Adult A と Adult B のメールアドレス |

Access は「どの Allow ポリシーにも一致しなければ拒否」なので、明示的な Deny ポリシーは不要。
Include に **Emails ending in**（ドメイン単位）を使わないこと。同じドメインの他人が通ってしまう。

登録するメールアドレスは seed で `users` に入れるもの（`SEED_ADULT_A_EMAIL` /
`SEED_ADULT_B_EMAIL`）と完全に一致させる。Access は通っても `users` に無ければ
アプリ側で 403 になる（`src/features/README.md`「認証の入口」）。

## 4. AUD タグと Team domain を控える

| 値 | 場所 |
| --- | --- |
| **Team domain** | Zero Trust > Settings > Custom Pages > Team domain。`<team>.cloudflareaccess.com` の形 |
| **AUD タグ** | Access > Applications > `Home Lv.2` > Overview > Application Audience (AUD) Tag。64 桁の 16 進数 |

どちらもシークレットではない。Team domain はログイン画面の URL、AUD は Access が付ける JWT の
`aud` クレームとして誰でも見られる値なので、`wrangler.jsonc` にそのままコミットしてよい。

## 5. 値をリポジトリに入れる

### 本番（`wrangler.jsonc`）

```jsonc
"vars": {
  "CF_ACCESS_TEAM_DOMAIN": "<team>.cloudflareaccess.com",
  "CF_ACCESS_AUD": "<64 桁の AUD タグ>"
}
```

`https://` は付けない（`verifyAccessJwt()` 側で付ける）。
どちらかが空のままだと `readAccessConfig()` が例外を投げ、全リクエストが設定エラー（500）になる（fail closed）。

`wrangler secret put` で入れたい場合は `vars` から該当キーを消してから行う。同名のキーが
`vars` と secret の両方にあるとデプロイ時に衝突する。

### ローカル（`.dev.vars`）

```bash
cp .dev.vars.example .dev.vars
```

ローカルの `pnpm dev` は Access を通らないので、`DEV_USER_EMAIL` に Adult A / B のどちらかを
入れてバイパスする。このバイパスは開発ビルドにしか存在しない（`access-config.ts`）。
本番と同じ JWT 検証をローカルで試すときは `DEV_USER_EMAIL` を空にして
`CF_ACCESS_TEAM_DOMAIN` / `CF_ACCESS_AUD` を入れる。

バイパス中は、リクエストに `X-Dev-User-Email` ヘッダを付けるとそのメールアドレスのユーザーとして
扱う（`verify-access-jwt.ts`）。E2E はこれで Adult A / B を切り替えている（`e2e/users.ts`）。
このヘッダもバイパスと同じく開発ビルドでしか読まれない。

## 6. 動作確認（完了条件）

デプロイ後（#42）に以下を確認する。`<host>` は Worker のホスト名。

**未ログインだと Access のログイン画面に飛ばされる**

```bash
curl -sI https://<host>/ | grep -iE '^(HTTP|location)'
```

`HTTP/2 302` と `location: https://<team>.cloudflareaccess.com/cdn-cgi/access/login/...` が出れば
Access が前段に入っている。`200` が返るならホスト名が Application domain と一致していない。

**許可外メールは拒否される**

ブラウザで `https://<host>/` を開き、許可していないメールアドレスを入力する。
「That account does not have access」と表示され、PIN の入力に進めないことを確認する。

**許可メールでログインするとアプリに到達する**

Adult A のメールアドレスで PIN を受け取ってログインし、トップページが表示されることを確認する。
続けて Access > Logs > Authentication に Allow のログが残っていることを見る。

401 が返る場合は Worker 側の JWT 検証で落ちている。`wrangler tail` で
`Access JWT の検証に失敗しました` のメッセージを見て、Team domain / AUD の値を疑う。

## 参考

- [Validate JWTs](https://developers.cloudflare.com/cloudflare-one/identity/authorization-cookie/validating-json/)
- [One-time PIN login](https://developers.cloudflare.com/cloudflare-one/identity/one-time-pin/)
- [Self-hosted applications](https://developers.cloudflare.com/cloudflare-one/applications/configure-apps/self-hosted-public-app/)
