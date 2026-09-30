import { useRouter } from '@tanstack/react-router'
import { useState } from 'react'

import { HydratedSelect } from '@/components/hydrated'
import {
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { HouseholdMemberSummary } from '@/features/auth/get-household-members'
import { submitAssignTask } from '@/features/task/server'

/** 未割当を表す Select の値。Radix は空文字を選択値にできない。 */
const UNASSIGNED = '__unassigned__'

/**
 * 担当者の設定・解除（spec §11 UC-04）。
 *
 * 担当変更は編集（updateTask）とは別のユースケースなので、フォームの保存を
 * 待たずに選んだ時点で反映する。
 */
export function AssigneeSelect({
  taskId,
  assigneeId,
  members,
}: {
  taskId: string
  assigneeId: string | null
  members: HouseholdMemberSummary[]
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function assign(value: string) {
    setBusy(true)
    try {
      await submitAssignTask({
        data: { id: taskId, assigneeId: value === UNASSIGNED ? null : value },
      })
      await router.invalidate()
    } finally {
      setBusy(false)
    }
  }

  return (
    <HydratedSelect
      value={assigneeId ?? UNASSIGNED}
      onValueChange={assign}
      disabled={busy}
    >
      <SelectTrigger aria-label="担当" className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={UNASSIGNED}>未割当</SelectItem>
        {members.map((member) => (
          <SelectItem key={member.id} value={member.id}>
            {member.name}
          </SelectItem>
        ))}
      </SelectContent>
    </HydratedSelect>
  )
}
