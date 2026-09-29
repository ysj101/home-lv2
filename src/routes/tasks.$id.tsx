import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/tasks/$id')({ component: TaskDetail })

function TaskDetail() {
  const { id } = Route.useParams()

  return (
    <p className="text-sm text-muted-foreground">
      Quest {id}（#34 で実装）
    </p>
  )
}
