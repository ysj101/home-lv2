import { createFileRoute } from '@tanstack/react-router'

import { NoMove } from '@/components/empty-state'
import { fetchMove } from '@/features/move/server'

export const Route = createFileRoute('/')({
  loader: () => fetchMove(),
  component: Dashboard,
})

function Dashboard() {
  const move = Route.useLoaderData()

  if (!move) {
    return (
      <NoMove description="まだ引越しが登録されていません。引越し日を決めるところから始めましょう。" />
    )
  }

  return (
    <p className="text-sm text-muted-foreground">Dashboard（#38 で実装）</p>
  )
}
