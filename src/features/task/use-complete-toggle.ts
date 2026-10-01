import { useRouter } from '@tanstack/react-router'
import { useState } from 'react'

import { submitCompleteTask, submitReopenTask } from '@/features/task/server'

/**
 * 完了 / 再オープンの切り替え。
 *
 * 一覧のチェックボックスと詳細のボタンで同じ手順（切り替えて読み直す）を
 * 使うので、呼び出し側は見た目だけを持つ。
 */
export function useCompleteToggle(task: { id: string; status: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const completed = task.status === 'completed'

  async function toggle() {
    setBusy(true)
    try {
      const data = { id: task.id }
      if (completed) await submitReopenTask({ data })
      else await submitCompleteTask({ data })

      await router.invalidate()
    } finally {
      setBusy(false)
    }
  }

  return { completed, busy, toggle }
}
