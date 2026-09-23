import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  return (
    <main>
      <h1>Home Lv.2</h1>
      <p>家族の暮らしを、次のレベルへ。</p>
    </main>
  )
}
