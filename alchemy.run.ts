/**
 * Alchemy v2 によるインフラ定義（Worker / D1 / Cloudflare Access）。
 *
 * - stage: `alchemy dev` は `dev_<user>`、`alchemy deploy` は `live_<user>`、本番は `prod`
 *   （`--stage prod`）。物理名に stage が入るので、stage が違えばリソースは衝突しない。
 * - state: Cloudflare 上の state store（アカウント共通の Worker + Secrets Store）。
 *   初回は `pnpm alchemy:bootstrap` で作る。手順は docs/alchemy.md。
 * - 本番の wrangler 管理リソースを引き取るのは #97。それまで `prod` stage には deploy しない。
 */
import * as Alchemy from 'alchemy'
import * as Cloudflare from '@alchemy.run/cloudflare'
import * as Effect from 'effect/Effect'

/** Zero Trust のチームドメイン。アカウントに 1 つだけ割り当てられる固定値。 */
const CF_ACCESS_TEAM_DOMAIN = 'ysj101.cloudflareaccess.com'

/**
 * Access で許可するメールアドレス（#95 で seed と同じ出所にする）。
 * 本番の Policy はまだダッシュボード管理なので、ここは検証用の値でよい。
 */
const ALLOWED_EMAILS = ['y.yagami101@gmail.com']

/**
 * マイグレーションの適用は #94 で設定する。Alchemy は drizzle-kit v0 レイアウト
 * （src/db/migrations/meta/_journal.json）を拒否するため、そのままでは渡せない。
 */
export const Database = Cloudflare.D1.Database('Database')

/**
 * Access Application を Worker とは別に宣言しておくと、出力の `aud` を
 * そのまま Worker の env に流せる（手で AUD タグを転記しなくてよい）。
 */
export const AccessApp = Cloudflare.Access.Application('AccessApp', {
  type: 'self_hosted',
  name: 'Home Lv.2 (alchemy spike)',
  sessionDuration: '24h',
  policies: [
    {
      decision: 'allow',
      include: ALLOWED_EMAILS.map((email) => ({ email })),
    },
  ],
})

/**
 * Access Application の `aud` は deploy 時に決まる出力なので、
 * Stack の中で yield したあとに Website を組み立てる。
 *
 * `alchemy dev` では Access Application を作らない。共有 Application は
 * 「enroll された Worker の destination」で domain が決まるため、Worker が
 * ローカル実行だと destination が無く Access API が 400 を返す。
 * ローカルは既存の DEV_USER_EMAIL バイパスで認証を代替する。
 */
const makeWebsite = (
  accessApp: Effect.Success<typeof AccessApp> | undefined,
) =>
  Cloudflare.Website.Vite('Website', {
    compatibility: { date: '2025-09-02' },
    access: accessApp,
    env: {
      DB: Database,
      CF_ACCESS_TEAM_DOMAIN,
      CF_ACCESS_AUD: accessApp ? accessApp.aud : '',
      DEV_USER_EMAIL: accessApp ? '' : 'adult-a@example.com',
    },
  })

export type WebsiteEnv = Cloudflare.InferEnv<ReturnType<typeof makeWebsite>>

export default Alchemy.Stack(
  'HomeLv2',
  {
    providers: Cloudflare.providers(),
    state: Cloudflare.state(),
  },
  Effect.gen(function* () {
    const isDev = yield* Alchemy.ALCHEMY_DEV
    const accessApp = isDev ? undefined : yield* AccessApp
    const website = yield* makeWebsite(accessApp)
    return { websiteUrl: website.url.as<string>() }
  }),
)
