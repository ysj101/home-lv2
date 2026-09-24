import { createFileRoute } from '@tanstack/react-router'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { pingDatabase } from '@/features/db/ping-database'

export const Route = createFileRoute('/')({
  component: Home,
  loader: () => pingDatabase(),
})

function Home() {
  const { ok } = Route.useLoaderData()

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-16">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Home Lv.2</CardTitle>
          <CardDescription>家族の暮らしを、次のレベルへ。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            データベース接続: {ok ? 'OK' : 'NG'}
          </p>
          <Button>はじめる</Button>
        </CardContent>
      </Card>
    </main>
  )
}
