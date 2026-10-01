import { createFileRoute } from '@tanstack/react-router'

import { NoMove } from '@/components/empty-state'
import { fetchMove } from '@/features/move/server'

export const Route = createFileRoute('/tasks')({
  loader: () => fetchMove(),
  component: Tasks,
})

function Tasks() {
  const move = Route.useLoaderData()

  if (!move) {
    return (
      <NoMove description="引越しを登録すると、標準の Quest がまとめて作られます。" />
    )
  }

  return <p className="text-sm text-muted-foreground">Quests（#31 で実装）</p>
}
