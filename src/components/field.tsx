import { Label } from '@/components/ui/label'

/** ラベル + 入力 + 説明/エラーの1組。フォーム全体で見た目を揃える。 */
export function Field({
  id,
  label,
  hint,
  required,
  children,
}: {
  id: string
  label: string
  hint?: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label}
        {required ? (
          <span className="text-destructive" aria-hidden>
            *
          </span>
        ) : null}
      </Label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  )
}

/** 送信に失敗したときの文言。サーバーの HttpError のメッセージをそのまま出す。 */
export function FormError({ error }: { error: unknown }) {
  if (!error) return null

  return (
    <p role="alert" className="text-sm text-destructive">
      {error instanceof Error ? error.message : String(error)}
    </p>
  )
}
