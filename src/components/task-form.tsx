import { useState } from 'react'

import { Field, FormError } from '@/components/field'
import { HydratedButton } from '@/components/hydrated-button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { HouseholdMemberSummary } from '@/features/auth/get-household-members'
import type { CreateTaskInput } from '@/features/task/create-task'
import { TASK_CATEGORY_OPTIONS } from '@/lib/task-category'
import { useHydrated } from '@/lib/use-hydrated'

const UNASSIGNED = '__unassigned__'

/** Quest の入力フォーム。追加（#33）と詳細の編集（#34）で共用する。 */
export function TaskForm({
  members,
  defaultValues,
  submitLabel,
  onSubmit,
}: {
  members: HouseholdMemberSummary[]
  defaultValues?: Partial<CreateTaskInput>
  submitLabel: string
  onSubmit: (input: CreateTaskInput) => Promise<void>
}) {
  const [error, setError] = useState<unknown>(null)
  const [saving, setSaving] = useState(false)
  const [category, setCategory] = useState(
    defaultValues?.category ?? 'other',
  )
  const [assigneeId, setAssigneeId] = useState(
    defaultValues?.assigneeId ?? UNASSIGNED,
  )
  const hydrated = useHydrated()

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSaving(true)

    const form = new FormData(event.currentTarget)

    try {
      await onSubmit({
        title: String(form.get('title') ?? ''),
        description: String(form.get('description') ?? ''),
        category,
        dueDate: String(form.get('dueDate') ?? '') || null,
        assigneeId: assigneeId === UNASSIGNED ? null : assigneeId,
      })
    } catch (cause) {
      setError(cause)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Field id="title" label="タイトル" required>
        <Input
          id="title"
          name="title"
          defaultValue={defaultValues?.title ?? ''}
          required
        />
      </Field>

      <Field id="description" label="説明">
        <Input
          id="description"
          name="description"
          defaultValue={defaultValues?.description ?? ''}
        />
      </Field>

      <Field id="category" label="カテゴリ" required>
        <Select
          value={category}
          onValueChange={(value) =>
            setCategory(value as CreateTaskInput['category'])
          }
          disabled={!hydrated}
        >
          <SelectTrigger id="category" aria-label="カテゴリ" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TASK_CATEGORY_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field id="dueDate" label="期限">
        <Input
          id="dueDate"
          name="dueDate"
          type="date"
          defaultValue={defaultValues?.dueDate ?? ''}
        />
      </Field>

      <Field id="assignee" label="担当">
        <Select
          value={assigneeId}
          onValueChange={setAssigneeId}
          disabled={!hydrated}
        >
          <SelectTrigger id="assignee" aria-label="担当" className="w-full">
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
        </Select>
      </Field>

      <FormError error={error} />

      <HydratedButton type="submit" className="w-full" disabled={saving}>
        {saving ? '保存中…' : submitLabel}
      </HydratedButton>
    </form>
  )
}
