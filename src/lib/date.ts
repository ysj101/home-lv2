/** 1日のミリ秒数。 */
const MS_PER_DAY = 24 * 60 * 60 * 1000

/** `YYYY-MM-DD` 形式の日付を UTC の Date として解釈する。 */
export function parseDate(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00Z`)
}

/** Date を `YYYY-MM-DD` 形式に整形する。 */
export function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

/** 基準日から `days` 日ずらした日付を `YYYY-MM-DD` で返す。 */
export function addDays(isoDate: string, days: number): string {
  return formatDate(new Date(parseDate(isoDate).getTime() + days * MS_PER_DAY))
}

/** `from` から `to` までの日数を返す。過去なら負の値になる。 */
export function daysBetween(from: string, to: string): number {
  return Math.round((parseDate(to).getTime() - parseDate(from).getTime()) / MS_PER_DAY)
}
