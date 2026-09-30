import { Button } from '@/components/ui/button'
import { useHydrated } from '@/lib/use-hydrated'

/**
 * ハイドレーションが終わるまで押せないボタン。
 *
 * Dialog や Select のトリガーは JS が繋がるまで何も起きず、押しても
 * 反応しないボタンに見えてしまう。押せる状態＝必ず動く状態に揃える。
 */
export function HydratedButton({
  disabled,
  ...props
}: React.ComponentProps<typeof Button>) {
  const hydrated = useHydrated()

  return <Button disabled={!hydrated || disabled} {...props} />
}
