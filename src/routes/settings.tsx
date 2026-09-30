import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useState } from 'react'

import { Field, FormError } from '@/components/field'
import { PageTitle } from '@/components/page-title'
import { HydratedButton } from '@/components/hydrated'
import { RecalculationDialog } from '@/components/recalculation-dialog'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  fetchMove,
  fetchRecalculationPreview,
  submitCreateMove,
  submitRecalculation,
  submitUpdateMove,
} from '@/features/move/server'
import type { DueDateChange } from '@/features/task/recalculate-due-dates'

export const Route = createFileRoute('/settings')({
  loader: () => fetchMove(),
  component: MoveSettings,
})

function MoveSettings() {
  const move = Route.useLoaderData()
  const router = useRouter()
  const [error, setError] = useState<unknown>(null)
  const [saving, setSaving] = useState(false)
  // 引越し日を変えたときに出す確認。null ならダイアログを開かない。
  const [pendingChanges, setPendingChanges] = useState<DueDateChange[] | null>(
    null,
  )

  const isCreate = move === null

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSaving(true)

    const form = new FormData(event.currentTarget)
    const input = {
      name: String(form.get('name') ?? ''),
      moveDate: String(form.get('moveDate') ?? ''),
      oldAddress: String(form.get('oldAddress') ?? ''),
      newAddress: String(form.get('newAddress') ?? ''),
    }

    try {
      if (isCreate) {
        await submitCreateMove({ data: input })
        await router.invalidate()
        return
      }

      // 引越し日が変わるなら、期限がずれる Quest を先に見せる。
      const changes =
        input.moveDate !== move.moveDate
          ? await fetchRecalculationPreview({
              data: { moveId: move.id, newMoveDate: input.moveDate },
            })
          : []

      await submitUpdateMove({ data: { moveId: move.id, input } })
      await router.invalidate()

      // 対象が0件ならダイアログは出さない。
      if (changes.length > 0) setPendingChanges(changes)
    } catch (cause) {
      setError(cause)
    } finally {
      setSaving(false)
    }
  }

  async function applyRecalculation() {
    if (!move) return

    setSaving(true)
    try {
      await submitRecalculation({ data: { moveId: move.id } })
      setPendingChanges(null)
      await router.invalidate()
    } catch (cause) {
      setError(cause)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <PageTitle>{isCreate ? '引越しを登録する' : '引越しの設定'}</PageTitle>
        <CardDescription>
          {isCreate
            ? '登録すると、引越し日を基準にした標準の Quest がまとめて作られます。'
            : '引越し名・日付・住所を変更できます。'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-5">
          <Field id="name" label="引越し名" required>
            <Input
              id="name"
              name="name"
              defaultValue={move?.name ?? ''}
              placeholder="Home Lv.2"
              required
            />
          </Field>

          <Field
            id="moveDate"
            label="引越し日"
            required
            hint="この日を基準に Quest の期限が決まります。"
          >
            <Input
              id="moveDate"
              name="moveDate"
              type="date"
              defaultValue={move?.moveDate ?? ''}
              required
            />
          </Field>

          <Field id="oldAddress" label="旧住所">
            <Input
              id="oldAddress"
              name="oldAddress"
              defaultValue={move?.oldAddress ?? ''}
              autoComplete="off"
            />
          </Field>

          <Field id="newAddress" label="新住所">
            <Input
              id="newAddress"
              name="newAddress"
              defaultValue={move?.newAddress ?? ''}
              autoComplete="off"
            />
          </Field>

          <FormError error={error} />

          <HydratedButton type="submit" className="w-full" disabled={saving}>
            {saving ? '保存中…' : isCreate ? '登録して Quest を作る' : '保存する'}
          </HydratedButton>
        </form>
      </CardContent>

      <RecalculationDialog
        changes={pendingChanges}
        busy={saving}
        onApply={applyRecalculation}
        onSkip={() => setPendingChanges(null)}
      />
    </Card>
  )
}
