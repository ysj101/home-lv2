import { badRequest } from '@/features/auth/errors'

/** `YYYY-MM-DD` 形式かつ実在する日付か。 */
export function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false

  const date = new Date(`${value}T00:00:00Z`)

  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value)
}

/** 前後の空白を落とし、空なら 400。 */
export function requireText(value: string, label: string): string {
  const trimmed = value.trim()
  if (!trimmed) {
    throw badRequest(`${label}を入力してください。`)
  }

  return trimmed
}

/** `YYYY-MM-DD` として妥当でなければ 400。 */
export function requireDate(value: string, label: string): string {
  if (!isValidDate(value)) {
    throw badRequest(`${label}は YYYY-MM-DD 形式で入力してください。`)
  }

  return value
}

/** 空文字を null に寄せる（住所や説明などの任意項目）。 */
export function optionalText(value: string | null | undefined): string | null {
  const trimmed = value?.trim()

  return trimmed ? trimmed : null
}
