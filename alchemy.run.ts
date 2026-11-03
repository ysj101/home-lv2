/**
 * #91 検証スパイク用の Alchemy v2 定義。
 *
 * 本番（wrangler.jsonc / Zero Trust ダッシュボード）には触らず、
 * 別 stage（live_<user>）に Worker / D1 / Access Application を作って動作を確かめる。
 * state はスパイク中は手元の .alchemy/ に置く（#92 で Cloudflare.state() にする）。
 */
import * as Alchemy from 'alchemy'
import * as Cloudflare from '@alchemy.run/cloudflare'
import * as Effect from 'effect/Effect'

/** Zero Trust のチームドメイン。アカウントに 1 つだけ割り当てられる固定値。 */
const CF_ACCESS_TEAM_DOMAIN = 'ysj101.cloudflareaccess.com'

/** スパイク中にログインを試すメールアドレス。 */
const ALLOWED_EMAILS = ['y.yagami101@gmail.com']

/**
 * スパイク用の回避: Alchemy は drizzle-kit v0 レイアウト（meta/_journal.json）を
 * 拒否するので、.sql だけをコピーしたディレクトリを渡す（#94 で正式に対応する）。
 */
export const Database = Cloudflare.D1.Database('Database', {
  migrations: '/private/tmp/claude-501/-Users-ysj-Documents-code-home-lv2/08977da7-3cef-42e3-a9c5-5e12bb1b5189/scratchpad/spike-migrations',
})

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
    state: Alchemy.localState(),
  },
  Effect.gen(function* () {
    const isDev = yield* Alchemy.ALCHEMY_DEV
    const accessApp = isDev ? undefined : yield* AccessApp
    const website = yield* makeWebsite(accessApp)
    return { websiteUrl: website.url.as<string>() }
  }),
)
