import { CardTitle } from '@/components/ui/card'

/**
 * 画面の見出し。
 *
 * shadcn の CardTitle は div なので、そのままだと画面に見出しが1つも無くなる。
 * 支援技術とキーボード操作のために h1 を必ず1つ置く。
 */
export function PageTitle({ children }: { children: React.ReactNode }) {
  return (
    <CardTitle>
      <h1>{children}</h1>
    </CardTitle>
  )
}
