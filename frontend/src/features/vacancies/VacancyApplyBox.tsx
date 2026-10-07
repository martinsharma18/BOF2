import { useRef, useState } from 'react'
import { CheckCircle2, Clock, FileText, Send, Upload, X, XCircle } from 'lucide-react'
import { Button, FieldError, Spinner, Textarea, toast } from '@/components/ui'
import { useAuth } from '@/features/auth/AuthContext'
import { getProblem } from '@/lib/api'
import { cn } from '@/lib/cn'
import { shrinkImage } from '@/lib/image'
import { useApplyToVacancy, useMyVacancyApplication } from './api'

const MAX_FILE_BYTES = 5 * 1024 * 1024
const CV_TYPES = 'image/jpeg,image/png,image/webp,application/pdf'

/**
 * Shown under "How to apply": individuals send their CV (photo or PDF) straight to the admins,
 * then see where their application stands. Other account types see nothing.
 */
export function VacancyApplyBox({ vacancyId }: { vacancyId: string }) {
  const { user } = useAuth()
  const isIndividual = user?.accountType === 'Individual'
  const mine = useMyVacancyApplication(vacancyId, isIndividual)
  const apply = useApplyToVacancy(vacancyId)
  const input = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [cv, setCv] = useState<File | null>(null)
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)

  if (!isIndividual) return null
  if (mine.isLoading)
    return (
      <div className="flex justify-center py-2 text-brand-500">
        <Spinner className="size-5" />
      </div>
    )

  if (mine.data) {
    const s = {
      Pending: { icon: <Clock className="size-4" />, text: 'Applied. Your CV is with the admin for review.', className: 'bg-amber-50 text-amber-800 ring-amber-200' },
      Accepted: { icon: <CheckCircle2 className="size-4" />, text: 'Accepted! You will be contacted with the next steps.', className: 'bg-emerald-50 text-emerald-800 ring-emerald-200' },
      Rejected: { icon: <XCircle className="size-4" />, text: 'Not selected this time. Thank you for applying.', className: 'bg-slate-50 text-slate-600 ring-slate-200' },
    }[mine.data.status]
    return <p className={cn('flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium ring-1', s.className)}>{s.icon}{s.text}</p>
  }

  const pick = async (picked: File | undefined) => {
    if (!picked) return
    if (!CV_TYPES.split(',').includes(picked.type)) return setError('Only a photo (JPG, PNG, WEBP) or a PDF is allowed.')
    const file = picked.type.startsWith('image/') ? await shrinkImage(picked, 2400, 0.9) : picked
    if (file.size > MAX_FILE_BYTES) return setError('The file must be 5 MB or smaller.')
    setError(null)
    setCv(file)
  }

  const submit = () => {
    if (!cv) return setError('Add your CV as a photo or PDF.')
    apply.mutate(
      { cv, note },
      {
        onSuccess: () => toast.success('Application sent'),
        onError: (e) => {
          const problem = getProblem(e)
          setError(problem?.errors?.Cv?.[0] ?? problem?.errors?.Note?.[0] ?? problem?.title ?? 'Could not send. Try again.')
        },
      },
    )
  }

  if (!open)
    return (
      <Button className="w-full" icon={<Send className="size-4" />} onClick={() => setOpen(true)}>
        Apply with your CV
      </Button>
    )

  return (
    <div className="animate-slide-up space-y-3 rounded-xl p-4 ring-1 ring-slate-200">
      <p className="text-sm font-semibold text-slate-900">Apply for this vacancy</p>
      <input
        ref={input}
        type="file"
        accept={CV_TYPES}
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          void pick(e.target.files?.[0])
          e.target.value = ''
        }}
      />
      {cv ? (
        <div className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2.5 ring-1 ring-slate-200">
          <FileText className="size-5 shrink-0 text-brand-600" />
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">{cv.name}</span>
          <Button size="icon" variant="ghost" className="size-8" aria-label="Remove CV" onClick={() => setCv(null)}>
            <X className="size-4" />
          </Button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => input.current?.click()}
          className="flex w-full flex-col items-center gap-1 rounded-lg border-2 border-dashed border-slate-300 px-4 py-5 text-center transition hover:border-brand-300 hover:bg-slate-50"
        >
          <Upload className="size-6 text-brand-500" />
          <span className="text-sm font-semibold text-slate-700">Add your CV</span>
          <span className="text-xs text-slate-500">Photo or PDF, up to 5 MB</span>
        </button>
      )}
      <Textarea rows={2} maxLength={500} placeholder="Short message (optional)" value={note} onChange={(e) => setNote(e.target.value)} aria-label="Message" />
      <FieldError message={error ?? undefined} />
      <div className="flex gap-2">
        <Button variant="secondary" className="flex-1" onClick={() => setOpen(false)} disabled={apply.isPending}>
          Cancel
        </Button>
        <Button className="flex-1" icon={<Send className="size-4" />} loading={apply.isPending} onClick={submit}>
          Apply
        </Button>
      </div>
    </div>
  )
}
