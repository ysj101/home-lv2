import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/tasks')({ component: Tasks })

function Tasks() {
  return <p className="text-sm text-muted-foreground">Quests（#31 で実装）</p>
}
