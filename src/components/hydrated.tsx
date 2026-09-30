import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
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

/**
 * ハイドレーションが終わるまで開けない Select。
 * 理由は HydratedButton と同じ。呼び出し側で useHydrated を書かなくて済むよう、
 * ボタンと同じ扱いをここに閉じ込める。
 */
export function HydratedSelect({
  disabled,
  ...props
}: React.ComponentProps<typeof Select>) {
  const hydrated = useHydrated()

  return <Select disabled={!hydrated || disabled} {...props} />
}
