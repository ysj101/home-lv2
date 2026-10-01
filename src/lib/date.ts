/**
 * 日付は `YYYY-MM-DD` 文字列で扱う（D1 に保存する形式と揃える）。
 * 期限や残り日数の計算はすべてこのモジュールを経由させ、呼び出し側で
 * Date の加減算を書かないこと。
 */

/**
 * アプリの基準タイムゾーン。
 *
 * Workers は UTC で動くので、そのまま日付にすると日本時間の深夜に
 * 「今日」が1日ずれる。家族3人が日本で使う前提なので JST に固定する。
 */
export const APP_TIME_ZONE = 'Asia/Tokyo'

/**
 * 基準タイムゾーンの日付フォーマッタ。
 * Intl.DateTimeFormat の生成はロケール解決を伴って重いので、
 * アイソレートごとに1つだけ作って使い回す（状態を持たないので安全）。
 * sv-SE ロケールは YYYY-MM-DD 形式で出力する。
 */
const dateFormatter = new Intl.DateTimeFormat('sv-SE', {
  timeZone: APP_TIME_ZONE,
})

/** 基準タイムゾーンでの「今日」を `YYYY-MM-DD` で返す。 */
export function today(now: Date = new Date()): string {
  return dateFormatter.format(now)
}

/** Date を基準タイムゾーンの `YYYY-MM-DD` にする。 */
export function toDateString(date: Date): string {
  return dateFormatter.format(date)
}

/** `YYYY-MM-DD` を一覧表示用の `M/D` にする。 */
export function toMonthDay(isoDate: string): string {
  const [, month, day] = isoDate.split('-')

  return `${Number(month)}/${Number(day)}`
}

/** 1日のミリ秒数。 */
const MS_PER_DAY = 24 * 60 * 60 * 1000

/** `YYYY-MM-DD` を UTC の Date として解釈する。 */
function parseDate(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00Z`)
}

/** Date を `YYYY-MM-DD` に整形する。 */
function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

/** 基準日から `days` 日ずらした日付を `YYYY-MM-DD` で返す。 */
export function addDays(isoDate: string, days: number): string {
  return formatDate(new Date(parseDate(isoDate).getTime() + days * MS_PER_DAY))
}

/** `from` から `to` までの日数を返す。過去なら負の値になる。 */
export function daysBetween(from: string, to: string): number {
  return Math.round(
    (parseDate(to).getTime() - parseDate(from).getTime()) / MS_PER_DAY,
  )
}
