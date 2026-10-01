import { useEffect, useState } from 'react'

/**
 * クライアント側のハイドレーションが終わったか。
 *
 * SSR された直後のフォームは onSubmit がまだ繋がっておらず、その状態で
 * 送信するとブラウザのネイティブ送信になって入力が失われる。送信ボタンを
 * これで無効にしておき、押せるようになった時点で必ず JS 側が処理する。
 */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => setHydrated(true), [])

  return hydrated
}
