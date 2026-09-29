/** 全画面共通の外枠。ヘッダー + 本文 + 下部ナビをモバイル優先で組む。 */
export function AppShell({
  userName,
  nav,
  children,
}: {
  userName?: string
  nav?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-10 border-b bg-background/95 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-2xl items-center justify-between px-4">
          <span className="font-heading text-lg font-semibold tracking-tight">
            HOME <span className="text-muted-foreground">Lv.2</span>
          </span>
          {userName ? (
            <span className="text-sm text-muted-foreground">{userName}</span>
          ) : null}
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
        {children}
      </main>

      {nav ? (
        <nav className="sticky bottom-0 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
          {nav}
        </nav>
      ) : null}
    </div>
  )
}
