import { AppShell } from '@/components/app-shell'

/** HttpError の status を UI 用の文言に落とす。 */
function describe(error: unknown): { title: string; detail: string } {
  const status = (error as { status?: number } | null)?.status

  if (status === 401) {
    return {
      title: 'ログインが必要です',
      detail:
        'Cloudflare Access のログインを済ませてから、もう一度開いてください。',
    }
  }

  if (status === 403) {
    return {
      title: 'このアプリを利用できません',
      detail:
        'ログインはできましたが、このアプリに登録されていないアカウントです。',
    }
  }

  return {
    title: '問題が発生しました',
    detail:
      error instanceof Error ? error.message : '時間をおいて再度お試しください。',
  }
}

export function ErrorScreen({ error }: { error: unknown }) {
  const { title, detail } = describe(error)

  return (
    <AppShell>
      <div className="mx-auto max-w-md space-y-2 py-12 text-center">
        <h1 className="text-lg font-semibold">{title}</h1>
        <p className="text-sm text-muted-foreground">{detail}</p>
      </div>
    </AppShell>
  )
}
