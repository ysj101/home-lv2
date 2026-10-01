import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/settings')({ component: Settings })

function Settings() {
  return <p className="text-sm text-muted-foreground">Settings（#29 で実装）</p>
}
