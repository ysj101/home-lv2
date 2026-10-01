import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({ component: Dashboard })

function Dashboard() {
  return (
    <p className="text-sm text-muted-foreground">Dashboard（#38 で実装）</p>
  )
}
