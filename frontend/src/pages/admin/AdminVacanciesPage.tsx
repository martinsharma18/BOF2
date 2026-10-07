import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Briefcase, FileText, Pencil, Plus, Trash2 } from 'lucide-react'
import { Alert, Badge, Button, Card, Checkbox, ConfirmDialog, Dialog, EmptyState, Field, Input, PageSpinner, Textarea, toast } from '@/components/ui'
import { useAdminVacancies, useDeleteVacancy, useSaveVacancy } from '@/features/vacancies/api'
import { VacancyApplicationsDialog } from '@/features/vacancies/VacancyApplicationsDialog'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { getErrorMessage } from '@/lib/api'
import { formatDay } from '@/lib/format'
import { applyServerErrors } from '@/lib/formErrors'
import type { Vacancy } from '@/lib/types'

const today = () => new Date().toISOString().slice(0, 10)

function status(v: Vacancy): { label: string; tone: 'green' | 'slate' } {
  if (!v.isActive) return { label: 'Hidden', tone: 'slate' }
  if (v.deadline && v.deadline < today()) return { label: 'Closed', tone: 'slate' }
  return { label: 'Open', tone: 'green' }
}

/** Super admin: post vacancies that everyone sees in the side rail. */
export function AdminVacanciesPage() {
  useDocumentTitle('Vacancies · Admin')
  const vacancies = useAdminVacancies()
  const remove = useDeleteVacancy()
  const [editing, setEditing] = useState<Vacancy | undefined>()
  const [formOpen, setFormOpen] = useState(false)
  const [deleting, setDeleting] = useState<Vacancy | null>(null)
  const [viewing, setViewing] = useState<Vacancy | null>(null)

  const openForm = (v?: Vacancy) => {
    setEditing(v)
    setFormOpen(true)
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-slate-500">Open vacancies show in the right-hand column for every user, newest first. They hide after the deadline.</p>
        <Button icon={<Plus className="size-4" />} onClick={() => openForm()} className="shrink-0">
          New vacancy
        </Button>
      </div>

      {vacancies.isLoading ? (
        <PageSpinner />
      ) : vacancies.isError ? (
        <Alert>{getErrorMessage(vacancies.error)}</Alert>
      ) : !vacancies.data?.length ? (
        <Card>
          <EmptyState
            icon={<Briefcase className="size-6" />}
            title="No vacancies yet"
            description="Post a vacancy and it will appear next to the feed for everyone."
            action={<Button onClick={() => openForm()}>Post a vacancy</Button>}
          />
        </Card>
      ) : (
        <Card>
          <ul className="divide-y divide-slate-100">
            {vacancies.data.map((v) => {
              const s = status(v)
              return (
                <li key={v.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-semibold text-slate-900">{v.title}</p>
                      <Badge tone={s.tone}>{s.label}</Badge>
                    </div>
                    <p className="truncate text-sm text-slate-500">
                      {v.organization} · {v.location}
                      {v.deadline && ` · Apply by ${formatDay(v.deadline)}`}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 max-sm:*:flex-1">
                    <Button size="sm" variant="soft" icon={<FileText className="size-3.5" />} onClick={() => setViewing(v)} className="max-sm:basis-full">
                      Applications {v.applicationCount > 0 && <span className="tabular-nums">({v.applicationCount})</span>}
                      {v.pendingApplicationCount > 0 && (
                        <span className="rounded-full bg-accent-500 px-1.5 text-[11px] font-bold text-white tabular-nums">{v.pendingApplicationCount} new</span>
                      )}
                    </Button>
                    <Button size="sm" variant="secondary" icon={<Pencil className="size-3.5" />} onClick={() => openForm(v)}>
                      Edit
                    </Button>
                    <Button size="sm" variant="ghost" icon={<Trash2 className="size-3.5" />} onClick={() => setDeleting(v)} className="text-red-600 hover:bg-red-50 hover:text-red-700">
                      Delete
                    </Button>
                  </div>
                </li>
              )
            })}
          </ul>
        </Card>
      )}

      {viewing && <VacancyApplicationsDialog vacancy={viewing} onClose={() => setViewing(null)} />}
      {formOpen && <VacancyFormDialog key={editing?.id ?? 'new'} vacancy={editing} onClose={() => setFormOpen(false)} />}
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() =>
          deleting &&
          remove.mutate(deleting.id, {
            onSuccess: () => {
              toast.success('Vacancy deleted')
              setDeleting(null)
            },
            onError: (error) => toast.error(getErrorMessage(error)),
          })
        }
        loading={remove.isPending}
        danger
        title="Delete this vacancy?"
        description={`"${deleting?.title}" will be removed for everyone.`}
        confirmLabel="Delete vacancy"
      />
    </div>
  )
}

const schema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(120),
  organization: z.string().trim().min(1, 'Organization is required').max(150),
  location: z.string().trim().min(1, 'Location is required').max(150),
  description: z.string().trim().min(1, 'Describe the job').max(2000),
  howToApply: z.string().trim().max(300),
  deadline: z.string(),
  isActive: z.boolean(),
})
type Values = z.infer<typeof schema>
const fields = Object.keys(schema.shape)

function VacancyFormDialog({ vacancy, onClose }: { vacancy?: Vacancy; onClose: () => void }) {
  const save = useSaveVacancy(vacancy?.id)
  const [formError, setFormError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: vacancy?.title ?? '',
      organization: vacancy?.organization ?? '',
      location: vacancy?.location ?? '',
      description: vacancy?.description ?? '',
      howToApply: vacancy?.howToApply ?? '',
      deadline: vacancy?.deadline ?? '',
      isActive: vacancy?.isActive ?? true,
    },
  })

  const onSubmit = handleSubmit((v) => {
    setFormError(null)
    save.mutate(
      { ...v, howToApply: v.howToApply || null, deadline: v.deadline || null },
      {
        onSuccess: () => {
          toast.success(vacancy ? 'Vacancy updated' : 'Vacancy posted')
          onClose()
        },
        onError: (error) => setFormError(applyServerErrors(error, setError, fields)),
      },
    )
  })

  return (
    <Dialog
      open
      onClose={onClose}
      size="lg"
      title={vacancy ? 'Edit vacancy' : 'Post a vacancy'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="vacancy-form" loading={save.isPending}>
            {vacancy ? 'Save changes' : 'Post vacancy'}
          </Button>
        </>
      }
    >
      <form id="vacancy-form" onSubmit={onSubmit} noValidate className="space-y-4">
        {formError && <Alert>{formError}</Alert>}
        <Field label="Job title" htmlFor="v-title" error={errors.title?.message}>
          <Input id="v-title" maxLength={120} placeholder="e.g. Accountant" {...register('title')} aria-invalid={!!errors.title} />
        </Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Organization" htmlFor="v-org" error={errors.organization?.message}>
            <Input id="v-org" maxLength={150} {...register('organization')} aria-invalid={!!errors.organization} />
          </Field>
          <Field label="Location" htmlFor="v-location" error={errors.location?.message}>
            <Input id="v-location" maxLength={150} placeholder="e.g. Kathmandu" {...register('location')} aria-invalid={!!errors.location} />
          </Field>
        </div>
        <Field label="Description" htmlFor="v-description" error={errors.description?.message} hint="Duties, requirements, salary.">
          <Textarea id="v-description" rows={5} maxLength={2000} {...register('description')} aria-invalid={!!errors.description} />
        </Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="How to apply" htmlFor="v-apply" optional error={errors.howToApply?.message} hint="A link, phone number or email.">
            <Input id="v-apply" maxLength={300} placeholder="https://… or 98XXXXXXXX" {...register('howToApply')} aria-invalid={!!errors.howToApply} />
          </Field>
          <Field label="Deadline" htmlFor="v-deadline" optional error={errors.deadline?.message} hint="Hidden from users after this day.">
            <Input id="v-deadline" type="date" {...register('deadline')} aria-invalid={!!errors.deadline} />
          </Field>
        </div>
        <Checkbox label="Show to users" {...register('isActive')} />
      </form>
    </Dialog>
  )
}
