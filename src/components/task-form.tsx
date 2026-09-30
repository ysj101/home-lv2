import { useState } from 'react'

import { Field, FormError } from '@/components/field'
import { HydratedButton, HydratedSelect } from '@/components/hydrated'
import { Input } from '@/components/ui/input'
import {
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { HouseholdMemberSummary } from '@/features/auth/get-household-members'
import type { CreateTaskInput } from '@/features/task/create-task'
import { TASK_CATEGORY_OPTIONS } from '@/lib/task-category'

const UNASSIGNED = '__unassigned__'

/** Quest の入力フォーム。追加（#33）と詳細の編集（#34）で共用する。 */
export function TaskForm({
  members,
  defaultValues,
  submitLabel,
  onSubmit,
  /**
   * 担当を含めるか。担当変更は UC-04（assignTask）という別のユースケースで、
   * updateTask は担当に触らない。編集画面で出すと変更が黙って捨てられるので、
   * 追加フォームでだけ出す（編集画面の担当変更は #36 で入れる）。
   */
  showAssignee = true,
}: {
  members: HouseholdMemberSummary[]
  defaultValues?: Partial<CreateTaskInput>
  submitLabel: string
  onSubmit: (input: CreateTaskInput) => Promise<void>
  showAssignee?: boolean
}) {
  // shadcn（Radix）の Select は native select と違って FormData に載らないので、
  // この2つだけ state で持ち、残りは defaultValue + FormData で扱う。
  const [error, setError] = useState<unknown>(null)
  const [saving, setSaving] = useState(false)
  const [category, setCategory] = useState(
    defaultValues?.category ?? 'other',
  )
  const [assigneeId, setAssigneeId] = useState(
    defaultValues?.assigneeId ?? UNASSIGNED,
  )
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
        <HydratedSelect
          value={category}
          onValueChange={(value) =>
            setCategory(value as CreateTaskInput['category'])
          }
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
        </HydratedSelect>
      </Field>

      <Field id="dueDate" label="期限">
        <Input
          id="dueDate"
          name="dueDate"
          type="date"
          defaultValue={defaultValues?.dueDate ?? ''}
        />
      </Field>

      {showAssignee ? (
        <Field id="assignee" label="担当">
          <HydratedSelect value={assigneeId} onValueChange={setAssigneeId}>
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
          </HydratedSelect>
        </Field>
      ) : null}

      <FormError error={error} />

      <HydratedButton type="submit" className="w-full" disabled={saving}>
        {saving ? '保存中…' : submitLabel}
      </HydratedButton>
    </form>
  )
}
