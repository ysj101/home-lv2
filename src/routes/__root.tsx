import {
  HeadContent,
  Link,
  Outlet,
  Scripts,
  createRootRoute,
} from '@tanstack/react-router'
import { CheckSquare, Home, Settings } from 'lucide-react'

import { AppShell } from '@/components/app-shell'
import { ErrorScreen } from '@/components/error-screen'
import { fetchCurrentUser } from '@/features/auth/server'
import appCss from '../styles/app.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      {
        name: 'viewport',
        // safe-area を使うため viewport-fit=cover を指定する。
        content:
          'width=device-width, initial-scale=1, viewport-fit=cover',
      },
      { title: 'Home Lv.2' },
      { name: 'theme-color', content: '#ffffff' },
    ],
    links: [{ rel: 'stylesheet', href: appCss }],
  }),
  // 現在ユーザーは全画面で必要なので root で1度だけ解決する。
  loader: () => fetchCurrentUser(),
  errorComponent: ({ error }) => (
    <RootDocument>
      <ErrorScreen error={error} />
    </RootDocument>
  ),
  shellComponent: RootDocument,
  component: RootLayout,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <head>
        <HeadContent />
      </head>
      <body className="min-h-dvh bg-background text-foreground">
        {children}
        <Scripts />
      </body>
    </html>
  )
}

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: Home },
  { to: '/tasks', label: 'Quests', icon: CheckSquare },
  { to: '/settings', label: 'Settings', icon: Settings },
] as const

function RootLayout() {
  const { user } = Route.useLoaderData()

  return (
    <AppShell userName={user.name} nav={<BottomNav />}>
      <Outlet />
    </AppShell>
  )
}

function BottomNav() {
  return (
    <ul className="mx-auto grid max-w-2xl grid-cols-3">
      {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
        <li key={to}>
          <Link
            to={to}
            // タップ領域を 44px 以上にする（spec §25 Mobile First）。
            className="flex min-h-14 flex-col items-center justify-center gap-1 text-xs text-muted-foreground transition-colors data-[status=active]:text-foreground"
            activeOptions={{ exact: to === '/' }}
          >
            <Icon className="size-5" aria-hidden />
            {label}
          </Link>
        </li>
      ))}
    </ul>
  )
}
