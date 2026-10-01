import { HydratedButton } from '@/components/hydrated'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { DueDateChange } from '@/features/task/recalculate-due-dates'
import { toMonthDay } from '@/lib/date'

/**
 * 引越し日を変えたときの期限再計算の確認（spec §11 UC-07）。
 *
 * MVP では自動更新せず、変更対象を見せてから一括更新する。
 * 「引越し日だけ変更」も選べるようにして、期限を据え置く選択肢を残す。
 */
export function RecalculationDialog({
  changes,
  busy,
  onApply,
  onSkip,
}: {
  changes: DueDateChange[] | null
  busy: boolean
  onApply: () => void
  onSkip: () => void
}) {
  return (
    <Dialog
      open={changes !== null}
      onOpenChange={(open) => {
        if (!open) onSkip()
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Quest の期限も更新しますか？</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          引越し日を変えると、標準 Quest
          {changes ? ` ${changes.length} 件` : ''}
          の期限がずれます。手動で追加した Quest と完了済みの Quest
          は変わりません。
        </p>

        <ul
          aria-label="期限が変わる Quest"
          className="max-h-60 space-y-1 overflow-y-auto text-sm"
        >
          {changes?.map((change) => (
            <li
              key={change.taskId}
              className="flex items-center justify-between gap-3 border-b py-2"
            >
              <span className="min-w-0 flex-1 truncate">{change.title}</span>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {change.currentDueDate
                  ? toMonthDay(change.currentDueDate)
                  : '期限なし'}
                {' → '}
                <span className="font-medium text-foreground">
                  {toMonthDay(change.nextDueDate)}
                </span>
              </span>
            </li>
          ))}
        </ul>

        <div className="flex gap-2">
          <HydratedButton
            variant="outline"
            className="flex-1"
            disabled={busy}
            onClick={onSkip}
          >
            引越し日だけ変更
          </HydratedButton>
          <HydratedButton
            className="flex-1"
            disabled={busy}
            onClick={onApply}
          >
            期限も更新する
          </HydratedButton>
        </div>
      </DialogContent>
    </Dialog>
  )
}
